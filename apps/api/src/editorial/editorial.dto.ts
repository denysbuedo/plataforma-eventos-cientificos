import {Type} from 'class-transformer';
import {IsArray,ArrayMaxSize,IsOptional,IsBoolean,IsDefined,IsIn,IsInt,IsString,IsUUID,Matches,Max,MaxLength,Min,MinLength,ValidateNested} from 'class-validator';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
export class EditorialContentDto {
 @ApiProperty() @IsString() @MinLength(3) @MaxLength(250) titleEs!:string;
 @ApiProperty() @IsString() @MinLength(3) @MaxLength(250) titleEn!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) publisher!:string;
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(12) @IsString({each:true}) @MinLength(2,{each:true}) @MaxLength(120,{each:true}) editors!:string[];
 @ApiProperty() @IsString() @MaxLength(4000) creditsEs!:string;
 @ApiProperty() @IsString() @MaxLength(4000) creditsEn!:string;
 @ApiProperty() @IsString() @MaxLength(4000) committeeEs!:string;
 @ApiProperty() @IsString() @MaxLength(4000) committeeEn!:string;
 @ApiProperty() @IsString() @MaxLength(10000) prefaceEs!:string;
 @ApiProperty() @IsString() @MaxLength(10000) prefaceEn!:string;
 @ApiProperty({enum:['track','activity']}) @IsIn(['track','activity']) groupBy!:'track'|'activity';
 @ApiProperty({enum:['es','en']}) @IsIn(['es','en']) locale!:'es'|'en';
 @ApiProperty() @IsString() @MaxLength(240) publicOrigin!:string;
}
export class EditorialRevisionDto { @ApiProperty() @IsInt() @Min(0) revision!:number; }
export class SaveEditorialDto extends EditorialRevisionDto { @ApiProperty({type:EditorialContentDto}) @IsDefined() @ValidateNested() @Type(()=>EditorialContentDto) content!:EditorialContentDto; }
export class SelectEditorialDto extends EditorialRevisionDto {
 @ApiProperty() @IsUUID() versionId!:string;
 @ApiProperty() @IsBoolean() included!:boolean;
 @ApiProperty() @IsBoolean() ready!:boolean;
 @ApiProperty() @IsInt() @Min(0) @Max(10000) order!:number;
 @ApiProperty() @IsString() @MaxLength(2000) note!:string;
}
export class AuthorPublicationPermissionDto extends EditorialRevisionDto {
 @ApiProperty() @IsUUID() versionId!:string;
 @ApiProperty() @IsBoolean() abstractAllowed!:boolean;
 @ApiProperty() @IsBoolean() fullTextAllowed!:boolean;
 @ApiProperty({enum:['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','all-rights-reserved']}) @IsIn(['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','all-rights-reserved']) license!:'CC-BY-4.0'|'CC-BY-SA-4.0'|'CC-BY-NC-4.0'|'all-rights-reserved';
 @ApiProperty() @IsBoolean() attested!:boolean;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
export class EditorialCandidatesQuery {
 @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() workId?:string;
 @ApiPropertyOptional() @IsString() @MaxLength(120) q='';
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(1000000) offset=0;
}
export class EditorialProofQuery { @ApiProperty() @Matches(/^[a-f0-9]{64}$/) proof!:string; }
export class PublishEditorialDto extends EditorialRevisionDto {
 @ApiProperty() @IsUUID() id!:string;
 @ApiProperty() @Matches(/^[a-f0-9]{64}$/) proof!:string;
 @ApiProperty() @IsBoolean() attested!:boolean;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
export class WithdrawPublicationDto extends EditorialRevisionDto { @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string; }
