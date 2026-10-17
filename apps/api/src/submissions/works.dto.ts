import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateBy, ValidateIf, ValidateNested, isEmail } from 'class-validator';
import { validOrcid, COUNTRY_CODES, WORK_STATUSES, type AuthorReviewFeedback, type WorkNoticeSummary, type WorkNoticeBoard, type WorkStatus, type Manuscript, type WorkVersionSummary, type WorkHistory, type AuthorWork, type AuthorWorkSummary, type AuthorWorkspace, type PublishedScientificCall, type WorkAffiliation, type WorkAuthor } from '@sep/contracts';
import { PublicEventDto } from '../events/event.dto.js';
import { PublishedCallDto } from '../science/call.dto.js';
export class WorkAffiliationDto implements WorkAffiliation {
  @ApiProperty({ minLength: 2, maxLength: 250 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(250) institution!: string;
  @ApiProperty({ description: 'ISO 3166-1 alpha-2', example: 'CU' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value) @IsIn(COUNTRY_CODES) countryCode!: string;
}
export class WorkAuthorDto implements WorkAuthor {
  @ApiPropertyOptional({description:'Calculado por servidor. Elegir una persona del directorio no confirma su autoría.'}) @ValidateIf((_,value)=>value!==undefined) @IsBoolean() authorshipConfirmed?:boolean;
  @ApiPropertyOptional() @ValidateIf((_,value)=>value!==undefined) @IsString() @ValidateBy({name:'orcid',validator:{validate:(value:unknown)=>value===''||validOrcid(value)}}) orcid?:string;
  @ApiPropertyOptional({format:'uuid'}) @Transform(({value})=>typeof value==='string'?value.toLowerCase():value) @ValidateIf((_,value)=>value!==undefined) @IsUUID() personId?:string;
  @ApiPropertyOptional({description:'Estado informativo. El servidor recalcula la verificación; no confía en este valor.'}) @ValidateIf((_,value)=>value!==undefined) @IsBoolean() orcidVerified?:boolean;
  @ApiProperty({ format: 'uuid' }) @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase() : value) @IsUUID() id!: string;
  @ApiProperty({ minLength: 2, maxLength: 150 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(150) fullName!: string;
  @ApiProperty({ maxLength: 254, description: 'Puede estar vacío salvo para el autor de correspondencia.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsString() @MaxLength(254)
  @ValidateBy({ name: 'authorEmail', validator: { validate: (value: unknown) => value === '' || typeof value === 'string' && isEmail(value) } }) email!: string;
  @ApiProperty() @IsBoolean() corresponding!: boolean;
  @ApiProperty({ type: [WorkAffiliationDto], minItems: 1, maxItems: 5 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5)
  @ValidateNested({ each: true }) @Type(() => WorkAffiliationDto) affiliations!: WorkAffiliationDto[];
}
export class CreateWorkDto {
  @ApiProperty({ minLength: 3, maxLength: 300 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @ApiProperty({ enum: ['es','en'] }) @IsIn(['es','en']) language!: 'es' | 'en';
  @ApiProperty({ format: 'uuid' }) @IsUUID() trackId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() contributionTypeId!: string;
}
export class WorkReviewReplyDto {
 @ApiProperty({minimum:1,maximum:20}) @IsInt() @Min(1) @Max(20) number!:number;
 @ApiProperty({maxLength:8000}) @IsString() @MaxLength(8000) text!:string;
}
export class WorkReviewResponseDraftDto {
 @ApiProperty({format:'uuid'}) @IsUUID() decisionId!:string;
 @ApiProperty({maxLength:12000}) @IsString() @MaxLength(12000) summary!:string;
 @ApiProperty({type:[WorkReviewReplyDto],maxItems:20}) @IsArray() @ArrayMaxSize(20) @ArrayUnique((item:WorkReviewReplyDto)=>item.number) @ValidateNested({each:true}) @Type(()=>WorkReviewReplyDto) replies!:WorkReviewReplyDto[];
}
export class WorkReviewResponseDto extends WorkReviewResponseDraftDto {
 @ApiPropertyOptional({format:'uuid'}) feedbackId?:string;@ApiPropertyOptional() feedbackVersionNumber?:number;
 @ApiProperty() versionNumber!:number;@ApiProperty() decisionMessage!:string;@ApiProperty() feedbackMessage!:string;@ApiPropertyOptional() roundNumber?:number;@ApiPropertyOptional({type:[WorkReviewReplyDto]}) comments?:WorkReviewReplyDto[];
}
export class SaveWorkDto extends CreateWorkDto {
 @ApiPropertyOptional({type:WorkReviewResponseDraftDto,nullable:true}) @ValidateIf((_,value)=>value!==undefined&&value!==null) @ValidateNested() @Type(()=>WorkReviewResponseDraftDto) reviewResponseDraft?:WorkReviewResponseDraftDto|null;
  @ApiPropertyOptional({ type: [WorkAuthorDto], maxItems: 20, description: 'Omitir conserva la autoría actual; [] deja el borrador sin autores declarados.' })
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(20)
  @ArrayUnique((author: WorkAuthor) => typeof author?.id === 'string' ? author.id.toLowerCase() : undefined)
  @ValidateNested({ each: true }) @Type(() => WorkAuthorDto) authors?: WorkAuthorDto[];
  @ApiProperty({ maxLength: 50000 }) @IsString() @MaxLength(50000) abstract!: string;
  @ApiProperty({ type: [String], maxItems: 20 }) @IsArray() @ArrayMaxSize(20)
  @Transform(({ value }) => Array.isArray(value) ? value.map((v: unknown) => typeof v === 'string' ? v.trim() : v) : value)
  @ArrayUnique((v: unknown) => typeof v === 'string' ? v.toLowerCase() : v) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(80, { each: true }) keywords!: string[];
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) revision!: number;
}
export class WorkSummaryDto implements AuthorWorkSummary {
  @ApiPropertyOptional({minimum:0}) unreadNotices?:number;
  @ApiProperty() canManage!:boolean;
  @ApiProperty({enum:WORK_STATUSES}) status!:WorkStatus;
  @ApiProperty({type:String,nullable:true,format:'date-time'}) submittedAt!:string|null;
  @ApiProperty({type:String,nullable:true,format:'date'}) responseDeadline!:string|null;
  @ApiProperty() editable!:boolean;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['es','en'] }) language!: 'es' | 'en';
  @ApiProperty({ format: 'uuid' }) trackId!: string;
  @ApiProperty({ format: 'uuid' }) contributionTypeId!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
class ReviewCommentDto { @ApiProperty() number!:number;@ApiProperty() text!:string }
export class AuthorReviewFeedbackDto implements AuthorReviewFeedback {
 @ApiProperty({format:'uuid'}) id!:string;@ApiProperty({format:'date-time'}) publishedAt!:string;@ApiProperty({description:'Copia pública histórica, sin notas privadas ni identidad de revisores.'}) message!:string;
 @ApiPropertyOptional() roundNumber?:number;@ApiPropertyOptional() versionNumber?:number;@ApiPropertyOptional({type:[ReviewCommentDto]}) comments?:{number:number;text:string}[];
}
class WorkNoticeSummaryDto implements WorkNoticeSummary { @ApiProperty({format:'uuid'}) workId!:string;@ApiProperty() title!:string;@ApiProperty({enum:WORK_STATUSES}) status!:WorkStatus;@ApiProperty() unreadNotices!:number;@ApiProperty({format:'date-time'}) latestAt!:string }
export class WorkNoticeBoardDto implements WorkNoticeBoard { @ApiProperty({minimum:0}) count!:number;@ApiProperty({type:[WorkNoticeSummaryDto]}) items!:WorkNoticeSummary[] }
export class ReadWorkNoticesDto { @ApiProperty({type:[String],minItems:1,maxItems:200}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ArrayUnique() @IsUUID('all',{each:true}) noticeIds!:string[] }
export class WorkResponseTargetDto {
 @ApiProperty({format:'uuid'}) decisionId!:string;@ApiProperty() message!:string;@ApiProperty() versionNumber!:number;@ApiPropertyOptional({type:AuthorReviewFeedbackDto}) feedback?:AuthorReviewFeedbackDto;
}
export class WorkDto extends WorkSummaryDto implements AuthorWork {
 @ApiPropertyOptional({type:WorkReviewResponseDraftDto,nullable:true}) reviewResponseDraft?:WorkReviewResponseDraftDto|null;
 @ApiPropertyOptional({type:WorkResponseTargetDto}) responseTarget?:WorkResponseTargetDto;
 @ApiPropertyOptional({type:WorkReviewResponseDto}) reviewResponse?:WorkReviewResponseDto;
 @ApiPropertyOptional({description:'False when requested corrections have not changed saved content.'}) submissionReady?:boolean;
 @ApiPropertyOptional({type:[AuthorReviewFeedbackDto]}) authorFeedback?:AuthorReviewFeedback[];
 @ApiPropertyOptional({type:[String]}) noticeIds?:string[];
  @ApiProperty({type:()=>ManuscriptDto,nullable:true}) manuscript!:Manuscript|null;
  @ApiProperty({type:()=>[VersionSummaryDto]}) versions!:WorkVersionSummary[];
  @ApiProperty({type:()=>[HistoryDto]}) history!:WorkHistory[];
  @ApiProperty({ type: [WorkAuthorDto], maxItems: 20 }) authors!: WorkAuthor[];
  @ApiProperty() abstract!: string;
  @ApiProperty({ type: [String] }) keywords!: string[];
  @ApiProperty({ type: PublishedCallDto }) call!: PublishedScientificCall;
}
export class ManuscriptDto implements Manuscript {
  @ApiProperty({format:'uuid'}) id!:string; @ApiProperty() name!:string; @ApiProperty() bytes!:number;
  @ApiProperty() pages!:number; @ApiProperty() sha256!:string; @ApiProperty({enum:['clean','demo_unscanned']}) scan!:'clean'|'demo_unscanned';
}
export class VersionSummaryDto implements WorkVersionSummary {
  @ApiProperty({format:'uuid'}) id!:string; @ApiProperty() number!:number;
  @ApiProperty({enum:['submission','final']}) kind!:'submission'|'final'; @ApiProperty({format:'date-time'}) createdAt!:string;
}
export class HistoryDto implements WorkHistory {
  @ApiProperty({format:'uuid'}) actorId!:string; @ApiProperty() actorName!:string;
  @ApiProperty({format:'uuid'}) id!:string; @ApiProperty() action!:string; @ApiProperty() message!:string;
  @ApiProperty({enum:['author','staff']}) actor!:'author'|'staff'; @ApiProperty({format:'date-time'}) createdAt!:string;
}
export class VersionContentDto extends CreateWorkDto {
 @ApiPropertyOptional({type:WorkReviewResponseDto}) reviewResponse?:WorkReviewResponseDto;
  @ApiProperty() abstract!:string; @ApiProperty({type:[String]}) keywords!:string[];
  @ApiProperty({type:PublishedCallDto}) call!:PublishedScientificCall;
  @ApiProperty({type:[WorkAuthorDto]}) authors!:WorkAuthor[];
  @ApiProperty({type:ManuscriptDto,nullable:true}) manuscript!:Manuscript|null;
}
export class VersionDto extends VersionSummaryDto { @ApiProperty({type:VersionContentDto}) content!:VersionContentDto }
export class StaffWorkDto extends WorkDto { @ApiProperty() canDecide!:boolean }
export class SubmissionPageDto { @ApiProperty({type:[WorkSummaryDto]}) data!:WorkSummaryDto[]; @ApiProperty() limit!:number; @ApiProperty() offset!:number }
export class AuthorWorkspaceDto implements AuthorWorkspace {
  @ApiProperty() requireSubmittingAuthorOrcid!:boolean;
  @ApiProperty({ type: [String], enum: ['es','en'] }) languages!: ('es' | 'en')[];
  @ApiProperty({ type: PublicEventDto }) event!: PublicEventDto;
  @ApiProperty({ type: [WorkSummaryDto] }) works!: AuthorWorkSummary[];
  @ApiProperty({ type: PublishedCallDto, nullable: true }) call!: PublishedScientificCall | null;
  @ApiProperty() editable!: boolean;
  @ApiProperty({ enum: ['available','no_call','closed','inactive'] }) reason!: AuthorWorkspace['reason'];
}
