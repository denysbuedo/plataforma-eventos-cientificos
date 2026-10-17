import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { Equals, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateBy,ValidateIf } from 'class-validator';
import {WORK_STATUSES,type WorkStatus} from '@sep/contracts';
export class WorkRevisionDto { @ApiProperty({minimum:1}) @Type(()=>Number) @IsInt() @Min(1) @Max(2147483646) revision!:number }
export class SubmitWorkDto extends WorkRevisionDto { @ApiProperty({enum:[true]}) @Equals(true) confirmed!:boolean }
export class WorkMessageDto extends WorkRevisionDto {
  @ApiProperty({minLength:10,maxLength:2000}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MinLength(10) @MaxLength(2000) message!:string;
}
export class WorkDecisionDto extends WorkMessageDto {
  @ApiPropertyOptional({minLength:20,maxLength:2000,description:'Excepción explícita y auditada cuando falta revisión de la versión actual.'}) @ValidateIf((_,value)=>value!==undefined) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MinLength(20) @MaxLength(2000) reviewOverrideReason?:string;
  @ApiProperty({enum:['in_review','changes_requested','accepted','rejected','final_requested']}) @IsIn(['in_review','changes_requested','accepted','rejected','final_requested']) decision!:'in_review'|'changes_requested'|'accepted'|'rejected'|'final_requested';
  @ApiProperty({type:String,nullable:true,format:'date'}) @ValidateBy({name:'dateOnly',validator:{validate:(v:unknown)=>v===null||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1900-01-01'&&v<='9999-12-31'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}}) responseDeadline!:string|null;
}
export class SubmissionQuery {
  @ApiPropertyOptional({enum:WORK_STATUSES}) @ValidateIf((_,value)=>value!==undefined) @IsIn(WORK_STATUSES) status?:WorkStatus;
  @ApiPropertyOptional({maxLength:100}) @ValidateIf((_,value)=>value!==undefined) @IsString() @MaxLength(100) q?:string;
  @ApiProperty({minimum:1,maximum:100,default:20}) @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit:number=20;
  @ApiProperty({minimum:0,maximum:10000,default:0}) @Type(()=>Number) @IsInt() @Min(0) @Max(10000) offset:number=0;
}
