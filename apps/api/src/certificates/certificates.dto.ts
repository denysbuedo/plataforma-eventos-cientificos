import {Type} from 'class-transformer';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean,IsDefined,IsIn,IsInt,IsOptional,IsString,IsUUID,Matches,Max,MaxLength,Min,MinLength,ValidateNested} from 'class-validator';
import {CERTIFICATE_KINDS,type CertificateKind} from '@sep/contracts';
class SignerDto {
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!:string;
 @ApiProperty() @IsString() @MaxLength(120) position!:string;
 @ApiProperty({type:String,nullable:true}) @IsOptional() @IsString() @MaxLength(88000) image!:string|null;
}
class TemplateContentDto {
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!:string;
 @ApiProperty({enum:CERTIFICATE_KINDS}) @IsIn(CERTIFICATE_KINDS) kind!:CertificateKind;
 @ApiProperty() @IsBoolean() active!:boolean;
 @ApiProperty() @IsBoolean() afterEvent!:boolean;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) titleEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) titleEn!:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(700) bodyEs!:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(700) bodyEn!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) participationEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) participationEn!:string;
 @ApiProperty() @IsString() @Matches(/^#[0-9a-f]{6}$/i) accent!:string;
 @ApiProperty({type:String,nullable:true}) @IsOptional() @IsString() @MaxLength(88000) logo!:string|null;
 @ApiProperty({type:[SignerDto]}) @IsArray() @ArrayMaxSize(2) @ValidateNested({each:true}) @Type(()=>SignerDto) signers!:SignerDto[];
 @ApiProperty() @IsString() @MaxLength(240) verificationOrigin!:string;
}
export class SaveCertificateTemplateDto {
 @ApiProperty() @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:TemplateContentDto}) @IsDefined() @ValidateNested() @Type(()=>TemplateContentDto) content!:TemplateContentDto;
}
export class CertificatePageQuery {
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(1000000) offset=0;
 @ApiPropertyOptional() @IsString() @MaxLength(120) q='';
 @ApiPropertyOptional({enum:['issued','revoked']}) @IsOptional() @IsIn(['issued','revoked']) status?:'issued'|'revoked';
}
export class CertificateCandidatesDto {
 @ApiProperty({format:'uuid'}) @IsUUID() templateId!:string;
 @ApiProperty() @IsString() @MaxLength(120) q='';
 @ApiProperty() @IsInt() @Min(1) @Max(50) limit=20;
 @ApiProperty() @IsInt() @Min(0) @Max(1000000) offset=0;
}
class IssueItemDto {
 @ApiProperty({format:'uuid'}) @IsUUID() personId!:string;
 @ApiProperty() @IsString() @MaxLength(100) subjectKey!:string;
 @ApiProperty() @Matches(/^[a-f0-9]{64}$/) evidenceHash!:string;
}
export class IssueCertificatesDto {
 @ApiProperty({format:'uuid'}) @IsUUID() templateId!:string;
 @ApiProperty() @IsInt() @Min(1) templateRevision!:number;
 @ApiProperty({enum:['es','en']}) @IsIn(['es','en']) locale!:'es'|'en';
 @ApiProperty({type:[IssueItemDto]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>IssueItemDto) items!:IssueItemDto[];
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
export class RevokeCertificateDto {
 @ApiProperty() @IsInt() @Min(1) revision!:number;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
