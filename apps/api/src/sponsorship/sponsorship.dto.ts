import {Type} from 'class-transformer';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean,IsDefined,IsIn,IsInt,IsOptional,IsString,IsUUID,Matches,Max,MaxLength,Min,MinLength,ValidateNested} from 'class-validator';
import {SPONSORSHIP_KINDS,SPONSORSHIP_STATES} from '@sep/contracts';
class CategoryDto {
 @ApiProperty() @IsUUID() id!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) nameEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) nameEn!:string;
 @ApiProperty() @IsInt() @Min(0) @Max(10000) order!:number;
 @ApiProperty() @IsBoolean() active!:boolean;
}
class SettingsDto {
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) titleEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) titleEn!:string;
 @ApiProperty() @IsString() @MaxLength(1200) introEs!:string;
 @ApiProperty() @IsString() @MaxLength(1200) introEn!:string;
 @ApiProperty({type:[CategoryDto]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>CategoryDto) categories!:CategoryDto[];
}
class ContactDto {
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) name!:string;
 @ApiProperty() @IsString() @MaxLength(120) position!:string;
 @ApiProperty() @IsString() @MaxLength(254) email!:string;
 @ApiProperty() @IsString() @MaxLength(80) phone!:string;
}
class SponsorDto {
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(180) nameEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(180) nameEn!:string;
 @ApiProperty() @IsString() @MaxLength(2) countryCode!:string;
 @ApiProperty() @IsString() @MaxLength(500) website!:string;
 @ApiProperty() @IsString() @MaxLength(1000) descriptionEs!:string;
 @ApiProperty() @IsString() @MaxLength(1000) descriptionEn!:string;
 @ApiProperty() @IsUUID() categoryId!:string;
 @ApiProperty({nullable:true,type:String}) @IsOptional() @IsString() @MaxLength(88000) logo!:string|null;
 @ApiProperty({type:[ContactDto]}) @IsArray() @ArrayMaxSize(5) @ValidateNested({each:true}) @Type(()=>ContactDto) contacts!:ContactDto[];
 @ApiProperty() @IsString() @MaxLength(2000) notes!:string;
 @ApiProperty() @IsBoolean() active!:boolean;
 @ApiProperty() @IsBoolean() publicSelected!:boolean;
 @ApiProperty() @IsBoolean() publicPermission!:boolean;
 @ApiProperty() @IsInt() @Min(0) @Max(10000) order!:number;
}
class CommitmentDto {
 @ApiProperty() @IsUUID() partnerId!:string;
 @ApiProperty() @IsString() @MinLength(3) @MaxLength(180) title!:string;
 @ApiProperty({enum:SPONSORSHIP_KINDS}) @IsIn(SPONSORSHIP_KINDS) kind!:typeof SPONSORSHIP_KINDS[number];
 @ApiProperty({enum:SPONSORSHIP_STATES}) @IsIn(SPONSORSHIP_STATES) status!:typeof SPONSORSHIP_STATES[number];
 @ApiProperty() @IsString() @MaxLength(18) amount!:string;
 @ApiProperty() @IsString() @MaxLength(3) currency!:string;
 @ApiProperty() @IsString() @MaxLength(1500) description!:string;
 @ApiProperty({nullable:true,type:String}) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate!:string|null;
 @ApiProperty({nullable:true,type:String}) @IsOptional() @IsUUID() responsibleId!:string|null;
 @ApiProperty() @IsString() @MaxLength(2000) notes!:string;
 @ApiProperty() @IsString() @MaxLength(1500) evidence!:string;
}
export class SponsorshipReasonDto {
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) reason!:string;
}
export class SaveSponsorshipSettingsDto extends SponsorshipReasonDto {
 @ApiProperty() @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:SettingsDto}) @IsDefined() @ValidateNested() @Type(()=>SettingsDto) content!:SettingsDto;
}
export class SaveSponsorDto extends SponsorshipReasonDto {
 @ApiProperty() @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:SponsorDto}) @IsDefined() @ValidateNested() @Type(()=>SponsorDto) content!:SponsorDto;
}
export class SaveSponsorCommitmentDto extends SponsorshipReasonDto {
 @ApiProperty() @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:CommitmentDto}) @IsDefined() @ValidateNested() @Type(()=>CommitmentDto) content!:CommitmentDto;
}
export class PublishSponsorshipDto extends SponsorshipReasonDto {
 @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!:string;
 @ApiProperty() @IsBoolean() attested!:boolean;
 @ApiProperty() @IsUUID() requestId!:string;
}
export class SponsorshipHistoryQuery {
 @ApiPropertyOptional() @IsOptional() @IsUUID() resourceId?:string;
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(100000) offset=0;
}
