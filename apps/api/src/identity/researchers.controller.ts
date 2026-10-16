import { Body, Controller, Get, Injectable, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { and, eq, sql } from 'drizzle-orm';
import { EDUCATION_LEVELS, emptyResearcherBackground, type ResearcherBackground, type ResearcherCandidate, type ResearcherProfile } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { people,researcherProfiles } from '../database/schema.js';
import { ApiException,type RequestContext,type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { Access } from '../platform/context.guard.js';
import { ApiErrors } from '../common/openapi.js';
import { WorkAffiliationDto } from '../submissions/works.dto.js';
class ResearcherBackgroundDto implements ResearcherBackground {
  @ApiProperty({enum:EDUCATION_LEVELS,default:''}) @IsIn(EDUCATION_LEVELS) educationLevel:ResearcherBackground['educationLevel']='';
  @ApiProperty({maxLength:150,default:''}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MaxLength(150) degreeTitle='';
  @ApiProperty({maxLength:150,default:''}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MaxLength(150) position='';
  @ApiProperty({type:[String],maxItems:10,default:[]}) @Transform(({value})=>Array.isArray(value)?value.map(item=>typeof item==='string'?item.trim().normalize('NFC'):item):value)
  @IsArray() @ArrayMaxSize(10) @ArrayUnique((item:unknown)=>typeof item==='string'?item.toLowerCase():item) @IsString({each:true}) @MinLength(1,{each:true}) @MaxLength(80,{each:true}) researchInterests:string[]=[];
  @ApiProperty({maxLength:1500,default:''}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MaxLength(1500) biography='';
  @ApiProperty({maxLength:300,default:''}) @Transform(({value})=>typeof value==='string'?value.trim():value) @ValidateIf((_,value)=>value!=='') @IsString() @MaxLength(300)
  @IsUrl({protocols:['http','https'],require_protocol:true,require_tld:false,disallow_auth:true}) website='';
}
export class SaveResearcherProfileDto implements ResearcherProfile {
  @ApiPropertyOptional({type:ResearcherBackgroundDto,description:'Omitir conserva los datos previos. Campos declarados y opcionales; no acredita títulos.'})
  @ValidateIf((_,value)=>value!==undefined) @IsObject() @ValidateNested() @Type(()=>ResearcherBackgroundDto) background?:ResearcherBackgroundDto;
  @ApiProperty({minLength:2,maxLength:150}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MinLength(2) @MaxLength(150) name!:string;
  @ApiProperty({type:[WorkAffiliationDto],maxItems:5}) @IsArray() @ArrayMaxSize(5) @ValidateNested({each:true}) @Type(()=>WorkAffiliationDto) affiliations!:WorkAffiliationDto[];
  @ApiProperty() @IsBoolean() discoverable!:boolean;
  @ApiProperty({minimum:0}) @IsInt() @Min(0) @Max(2147483646) revision!:number;
}
export class ResearcherProfileDto extends SaveResearcherProfileDto {}
class ResearcherQuery {
  @ApiProperty({minLength:3,maxLength:100}) @Transform(({value})=>typeof value==='string'?value.trim().normalize('NFC').replace(/^https:\/\/orcid\.org\//iu,'').replace(/\s+/gu,' '):value) @IsString() @MinLength(3) @MaxLength(100) q!:string;
}
class ResearcherCandidateDto implements ResearcherCandidate {
  @ApiProperty({format:'uuid'}) personId!:string; @ApiProperty() name!:string; @ApiProperty({type:[WorkAffiliationDto]}) affiliations!:WorkAffiliationDto[];
  @ApiProperty({type:String,nullable:true}) orcid!:string|null;
}
export async function lookupResearcher(tx:DbTransaction,id:string):Promise<ResearcherCandidate|null>{
  const result=await tx.execute<ResearcherCandidate & Record<string,unknown>>(sql`SELECT person_id AS "personId",name,affiliations,orcid FROM sep_researcher_directory(NULL,${id}::uuid)`);
  return result.rows[0]??null;
}
@Injectable()
export class ResearchersService {
  private readonly windows=new Map<string,{started:number;count:number}>();
  constructor(private readonly database:DatabaseService,private readonly audit:AuditService){}
  private limit(personId:string){
    const now=Date.now();let entry=this.windows.get(personId);
    if(!entry||now-entry.started>=60000){if(!entry&&this.windows.size>=10000)this.windows.delete(this.windows.keys().next().value!);entry={started:now,count:0};this.windows.set(personId,entry);}
    if(++entry.count>60)throw new ApiException(429,'DIRECTORY_RATE_LIMIT');
  }
  search(context:RequestContext,q:string){
    this.limit(context.personId!);
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const [actor]=await tx.select({id:people.id}).from(people).where(and(eq(people.id,context.personId!),eq(people.active,true)));if(!actor)throw new ApiException(401,'UNAUTHORIZED');
      const result=await tx.execute<ResearcherCandidate & Record<string,unknown>>(sql`SELECT person_id AS "personId",name,affiliations,orcid FROM sep_researcher_directory(${q},NULL)`);return result.rows;
    });
  }
  save(context:RequestContext,dto:SaveResearcherProfileDto){return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    const [person]=await tx.select().from(people).where(and(eq(people.id,context.personId!),eq(people.active,true))).for('update');if(!person)throw new ApiException(401,'UNAUTHORIZED');
    const [before]=await tx.select().from(researcherProfiles).where(eq(researcherProfiles.personId,context.personId!));if((before?.revision??0)!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');
    if(dto.discoverable&&!dto.affiliations.length)throw new ApiException(400,'RESEARCHER_AFFILIATION_REQUIRED');
    const keys=dto.affiliations.map(item=>`${item.institution.trim().normalize('NFC').toLowerCase()}:${item.countryCode}`);if(new Set(keys).size!==keys.length)throw new ApiException(400,'AUTHOR_AFFILIATION_DUPLICATE');
    const values={affiliations:dto.affiliations,discoverable:dto.discoverable,revision:dto.revision+1,background:dto.background??before?.background??emptyResearcherBackground()};
    await tx.insert(researcherProfiles).values({personId:context.personId!,...values}).onConflictDoUpdate({target:researcherProfiles.personId,set:values});
    await tx.update(people).set({name:dto.name}).where(eq(people.id,context.personId!));
    await this.audit.organization(tx,context,'identity.profile.updated',context.personId!);
    return {name:dto.name,...values};
  });}
}
@ApiTags('identity') @ApiBearerAuth() @ApiErrors() @Controller()
export class ResearchersController {
  constructor(private readonly service:ResearchersService){}
  @Get('researchers') @Access('identity-read') @ApiOkResponse({type:[ResearcherCandidateDto]}) search(@Req()request:SepRequest,@Query()query:ResearcherQuery){return this.service.search(request.security,query.q);}
  @Put('me/researcher-profile') @Access('identity-read') @ApiOkResponse({type:ResearcherProfileDto}) save(@Req()request:SepRequest,@Body()dto:SaveResearcherProfileDto){return this.service.save(request.security,dto);}
}
