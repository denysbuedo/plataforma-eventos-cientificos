import {WorkReviewResponseDto,WorkAffiliationDto,ManuscriptDto} from './works.dto.js';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Transform,Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,ArrayUnique,Equals,IsArray,IsIn,IsInt,IsObject,IsString,IsUUID,Max,MaxLength,Min,MinLength,ValidateBy,ValidateNested} from 'class-validator';
import {REVIEW_RECOMMENDATIONS,type ReviewCriterion,type ReviewEvaluation,type ReviewMember,type ReviewRound,type ReviewAssignment,type ReviewWorkspace,type WorkReviewFile,type ReviewContent} from '@sep/contracts';
import {WorkRevisionDto,WorkMessageDto} from './workflow.dto.js';
const trim=({value}:{value:unknown})=>typeof value==='string'?value.trim():value;
export class InviteReviewerDto {
 @ApiProperty({format:'uuid'}) @IsUUID() personId!:string;
 @ApiProperty({maxLength:500,default:''}) @Transform(trim) @IsString() @MaxLength(500) expertise='';
}
export class MemberResponseDto extends WorkRevisionDto {
 @ApiProperty({enum:['accept','decline']}) @IsIn(['accept','decline']) action!:'accept'|'decline';
 @ApiProperty({enum:[true]}) @Equals(true) confirmed!:boolean;
}
class CriterionDto implements ReviewCriterion {
 @ApiProperty({format:'uuid'}) @IsUUID() id!:string;
 @ApiProperty({minLength:2,maxLength:150}) @Transform(trim) @IsString() @MinLength(2) @MaxLength(150) labelEs!:string;
 @ApiProperty({minLength:2,maxLength:150}) @Transform(trim) @IsString() @MinLength(2) @MaxLength(150) labelEn!:string;
}
export class CreateReviewRoundDto extends WorkRevisionDto {
 @ApiProperty({format:'date'}) @ValidateBy({name:'calendarDate',validator:{validate:(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1900-01-01'&&v<='9999-12-31'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}}) deadline!:string;
 @ApiProperty({minimum:1,maximum:5}) @IsInt() @Min(1) @Max(5) minimumReviews!:number;
 @ApiProperty({type:[CriterionDto],minItems:1,maxItems:10}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique((item:CriterionDto)=>item?.id) @IsObject({each:true}) @ValidateNested({each:true}) @Type(()=>CriterionDto) criteria!:CriterionDto[];
}
export class AssignReviewerDto extends WorkRevisionDto { @ApiProperty({format:'uuid'}) @IsUUID() reviewerId!:string }
export class ReviewResponseDto extends WorkRevisionDto {
 @ApiProperty({enum:['accept','decline','conflict']}) @IsIn(['accept','decline','conflict']) action!:'accept'|'decline'|'conflict';
 @ApiProperty({maxLength:2000,default:''}) @Transform(trim) @IsString() @MaxLength(2000) message='';
 @ApiProperty({enum:[true]}) @Equals(true) confirmed!:boolean;
}
class ReviewScoreDto {
 @ApiProperty({format:'uuid'}) @IsUUID() criterionId!:string;
 @ApiProperty({minimum:1,maximum:5}) @IsInt() @Min(1) @Max(5) score!:number;
}
class EvaluationDto implements ReviewEvaluation {
 @ApiProperty({type:[ReviewScoreDto],maxItems:10}) @IsArray() @ArrayMaxSize(10) @ArrayUnique((item:ReviewScoreDto)=>item?.criterionId) @IsObject({each:true}) @ValidateNested({each:true}) @Type(()=>ReviewScoreDto) scores!:ReviewScoreDto[];
 @ApiProperty({enum:[...REVIEW_RECOMMENDATIONS,'']}) @IsIn([...REVIEW_RECOMMENDATIONS,'']) recommendation!:ReviewEvaluation['recommendation'];
 @ApiProperty({maxLength:8000}) @Transform(trim) @IsString() @MaxLength(8000) authorComments!:string;
 @ApiProperty({maxLength:8000}) @Transform(trim) @IsString() @MaxLength(8000) confidentialComments!:string;
}
export class SaveReviewDto extends WorkRevisionDto {
 @ApiProperty({type:EvaluationDto}) @IsObject() @ValidateNested() @Type(()=>EvaluationDto) evaluation!:EvaluationDto;
}
export class SubmitReviewDto extends SaveReviewDto { @ApiProperty({enum:[true]}) @Equals(true) confirmed!:boolean }
export class ReviewMemberDto implements ReviewMember {
 @ApiProperty({format:'uuid'}) personId!:string;@ApiProperty() name!:string;@ApiProperty({enum:['invited','accepted','declined','revoked']}) status!:ReviewMember['status'];@ApiProperty() expertise!:string;@ApiProperty() revision!:number;@ApiProperty({format:'date-time'}) createdAt!:string;@ApiPropertyOptional() pendingReviews?:number;
}
export class ReviewRoundDto implements ReviewRound {
 @ApiProperty({format:'uuid'}) id!:string;@ApiProperty({format:'uuid'}) workId!:string;@ApiProperty({format:'uuid'}) versionId!:string;@ApiProperty() versionNumber!:number;@ApiProperty() number!:number;@ApiProperty({enum:['open','closed']}) status!:ReviewRound['status'];@ApiProperty({format:'date'}) deadline!:string;@ApiProperty() timezone!:string;@ApiProperty() minimumReviews!:number;@ApiProperty({type:[CriterionDto]}) criteria!:ReviewCriterion[];@ApiProperty() revision!:number;@ApiProperty({format:'date-time'}) createdAt!:string;@ApiProperty({type:String,nullable:true,format:'date-time'}) closedAt!:string|null;
}
class ReviewAuthorContentDto { @ApiProperty() fullName!:string;@ApiProperty({type:[WorkAffiliationDto]}) affiliations!:import('@sep/contracts').WorkAffiliation[] }
class ReviewContentDto implements ReviewContent { @ApiProperty() title!:string;@ApiProperty() abstract!:string;@ApiProperty({type:[String]}) keywords!:string[];@ApiProperty({enum:['es','en']}) language!:'es'|'en';@ApiProperty({type:[ReviewAuthorContentDto]}) authors!:ReviewContent['authors'];@ApiProperty({type:ManuscriptDto,nullable:true}) manuscript!:ReviewContent['manuscript'];@ApiPropertyOptional({type:WorkReviewResponseDto}) reviewResponse?:ReviewContent['reviewResponse'] }
export class ReviewAssignmentDto implements ReviewAssignment {
 @ApiPropertyOptional({description:'Solo para el comité: no tiene conflictos detectados al consultar el expediente.'}) eligible?:boolean;
 @ApiProperty({format:'uuid'}) id!:string;@ApiProperty({format:'uuid'}) roundId!:string;@ApiProperty({format:'uuid'}) workId!:string;@ApiProperty({format:'uuid'}) reviewerId!:string;@ApiProperty() reviewerName!:string;@ApiProperty({enum:['invited','accepted','declined','conflict','revoked','submitted']}) status!:ReviewAssignment['status'];@ApiProperty() title!:string;@ApiProperty() versionNumber!:number;@ApiProperty({format:'date'}) deadline!:string;@ApiProperty() timezone!:string;@ApiProperty() revision!:number;@ApiProperty({type:String,nullable:true,format:'date-time'}) submittedAt!:string|null;@ApiProperty() message!:string;@ApiProperty({type:EvaluationDto,nullable:true}) evaluation!:ReviewEvaluation|null;@ApiPropertyOptional({type:ReviewContentDto,description:'Versión oficial asignada sin correos, ORCID ni IDs de autores. El PDF solo se habilita tras aceptar y mientras siga vigente.'}) content?:ReviewContent;@ApiProperty({type:[CriterionDto]}) criteria!:ReviewCriterion[];@ApiProperty() available!:boolean;
}
export class ReviewWorkspaceDto implements ReviewWorkspace { @ApiProperty({type:[ReviewMemberDto]}) members!:ReviewMember[];@ApiProperty({type:[ReviewAssignmentDto]}) assignments!:ReviewAssignment[] }
export class WorkReviewFileDto implements WorkReviewFile { @ApiProperty({type:[ReviewRoundDto]}) rounds!:ReviewRound[];@ApiProperty({type:[ReviewAssignmentDto]}) assignments!:ReviewAssignment[] }
export {WorkRevisionDto,WorkMessageDto};
