import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Type,Transform} from 'class-transformer';
import {IsUUID,IsString,IsArray,ArrayMaxSize,ArrayUnique,IsIn,IsInt,Min,Max,MaxLength,MinLength,Matches,ValidateBy,ValidateNested} from 'class-validator';
import type {ProgramSessionInput,ProgramSlotInput} from '@sep/contracts';
const trim=({value}:{value:unknown})=>typeof value==='string'?value.trim().normalize('NFC'):value;
export class ProgramSlotDto implements ProgramSlotInput {
 @ApiProperty() @Transform(({value})=>typeof value==='string'?value.toLowerCase():value) @IsUUID() id!:string;@ApiProperty() @Transform(({value})=>typeof value==='string'?value.toLowerCase():value) @IsUUID() workId!:string;@ApiProperty() @Transform(({value})=>typeof value==='string'?value.toLowerCase():value) @IsUUID() presenterAuthorId!:string;
 @ApiProperty({example:'09:00'}) @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) startsAt!:string;
 @ApiProperty({example:'09:20'}) @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) endsAt!:string;
}
export class ProgramSessionDto implements ProgramSessionInput {
 @ApiProperty() @Transform(({value})=>typeof value==='string'?value.toLowerCase():value) @IsUUID() id!:string;
 @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) titleEs!:string;
 @ApiProperty() @Transform(trim) @IsString() @MaxLength(200) titleEn!:string;
 @ApiProperty() @Transform(trim) @IsString() @MaxLength(200) topicEs!:string;
 @ApiProperty() @Transform(trim) @IsString() @MaxLength(200) topicEn!:string;
 @ApiProperty({format:'date'}) @ValidateBy({name:'programDate',validator:{validate:(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1900-01-01'&&v<='9999-12-31'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}}) date!:string;
 @ApiProperty() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) startsAt!:string;
 @ApiProperty() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) endsAt!:string;
 @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) room!:string;
 @ApiProperty({enum:['in_person','virtual','hybrid']}) @IsIn(['in_person','virtual','hybrid']) modality!:'in_person'|'virtual'|'hybrid';
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(5) @Transform(({value})=>Array.isArray(value)?value.map(v=>typeof v==='string'?v.toLowerCase():v):value) @ArrayUnique() @IsUUID(undefined,{each:true}) moderatorIds!:string[];
 @ApiProperty({type:[ProgramSlotDto]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique((v:ProgramSlotInput)=>v?.id?.toLowerCase()) @ValidateNested({each:true}) @Type(()=>ProgramSlotDto) slots!:ProgramSlotDto[];
}
export class ProgramRevisionDto { @ApiProperty() @IsInt() @Min(0) @Max(2147483646) revision!:number }
export class SaveProgramDto extends ProgramRevisionDto { @ApiProperty({type:[ProgramSessionDto]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique((v:ProgramSessionInput)=>v?.id?.toLowerCase()) @ValidateNested({each:true}) @Type(()=>ProgramSessionDto) sessions!:ProgramSessionDto[] }
export class ProgramCandidatesQuery {
 @ApiPropertyOptional({default:''}) @IsString() @MaxLength(100) q='';
 @ApiPropertyOptional({default:25}) @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit=25;
 @ApiPropertyOptional({default:0}) @Type(()=>Number) @IsInt() @Min(0) @Max(100000) offset=0;
}
export class ProgramAuthorDto { @ApiProperty() id!:string;@ApiProperty() name!:string }
export class ProgramModeratorDto { @ApiProperty() personId!:string;@ApiProperty() name!:string }
export class PublicProgramSlotDto extends ProgramSlotDto { @ApiProperty() title!:string;@ApiProperty({type:[String]}) authors!:string[];@ApiProperty() presenterName!:string;@ApiProperty() versionId!:string;@ApiProperty() versionNumber!:number }
export class ProgramSlotViewDto extends PublicProgramSlotDto { @ApiProperty({type:[ProgramAuthorDto]}) presenterOptions!:ProgramAuthorDto[];@ApiProperty({type:String,nullable:true}) presenterPersonId!:string|null }
export class ProgramSessionViewDto extends ProgramSessionDto { @ApiProperty({type:[ProgramModeratorDto]}) moderators!:ProgramModeratorDto[];@ApiProperty({type:[ProgramSlotViewDto]}) declare slots:ProgramSlotViewDto[] }
export class ProgramDraftDto { @ApiProperty({type:[ProgramSessionViewDto]}) sessions!:ProgramSessionViewDto[];@ApiProperty() timezone!:string;@ApiProperty({type:String,nullable:true}) startDate!:string|null;@ApiProperty({type:String,nullable:true}) endDate!:string|null;@ApiProperty() revision!:number;@ApiProperty({type:Number,nullable:true}) publishedRevision!:number|null;@ApiProperty({type:String,nullable:true}) publishedAt!:string|null }
export class PublicProgramSessionDto {
 @ApiProperty() id!:string;@ApiProperty() titleEs!:string;@ApiProperty() titleEn!:string;@ApiProperty() topicEs!:string;@ApiProperty() topicEn!:string;@ApiProperty() date!:string;@ApiProperty() startsAt!:string;@ApiProperty() endsAt!:string;@ApiProperty() room!:string;@ApiProperty({enum:['in_person','virtual','hybrid']}) modality!:string;@ApiProperty({type:[String]}) moderators!:string[];@ApiProperty({type:[PublicProgramSlotDto]}) slots!:PublicProgramSlotDto[];
}
export class PublicProgramDto { @ApiProperty({type:[PublicProgramSessionDto]}) sessions!:PublicProgramSessionDto[];@ApiProperty() timezone!:string;@ApiProperty() revision!:number;@ApiProperty() publishedAt!:string }
export class ProgramCandidateDto { @ApiProperty() workId!:string;@ApiProperty() title!:string;@ApiProperty() versionNumber!:number;@ApiProperty({type:[ProgramAuthorDto]}) authors!:ProgramAuthorDto[] }
export class ProgramCandidatesDto { @ApiProperty({type:[ProgramCandidateDto]}) data!:ProgramCandidateDto[];@ApiProperty() total!:number;@ApiProperty() limit!:number;@ApiProperty() offset!:number }
export class ParticipationItemDto { @ApiProperty() sessionId!:string;@ApiProperty({type:String,nullable:true}) slotId!:string|null;@ApiProperty() title!:string;@ApiProperty() sessionTitleEs!:string;@ApiProperty() sessionTitleEn!:string;@ApiProperty() date!:string;@ApiProperty() startsAt!:string;@ApiProperty() endsAt!:string;@ApiProperty() room!:string;@ApiProperty({enum:['in_person','virtual','hybrid']}) modality!:string;@ApiProperty({enum:['presenter','moderator']}) role!:string }
export class MyParticipationDto { @ApiProperty({type:[ParticipationItemDto]}) items!:ParticipationItemDto[];@ApiProperty({type:String,nullable:true}) timezone!:string|null;@ApiProperty({type:String,nullable:true}) publishedAt!:string|null }
