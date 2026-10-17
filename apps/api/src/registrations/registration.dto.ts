import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,ArrayUnique,IsDefined,IsArray,IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,Matches,Max,MaxLength,Min,MinLength,ValidateNested} from 'class-validator';
import {REGISTRATION_STATES} from '@sep/contracts';
class CategoryDto {
 @ApiProperty() @IsUUID() id!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) nameEs!:string;
 @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) nameEn!:string;
 @ApiProperty() @IsBoolean() active!:boolean;
}
class ContentDto {
 @ApiProperty({type:String,nullable:true,pattern:'^\\d{4}-\\d{2}-\\d{2}$'}) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) opensOn!:string|null;
 @ApiProperty({type:String,nullable:true,pattern:'^\\d{4}-\\d{2}-\\d{2}$'}) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) closesOn!:string|null;
 @ApiProperty() @IsString() @MaxLength(2000) instructionsEs!:string;
 @ApiProperty() @IsString() @MaxLength(2000) instructionsEn!:string;
 @ApiProperty() @IsBoolean() approvalRequired!:boolean;
 @ApiProperty({type:Number,nullable:true,minimum:0,maximum:1000000}) @IsOptional() @IsInt() @Min(0) @Max(1000000) capacityInPerson!:number|null;
 @ApiProperty({type:Number,nullable:true,minimum:0,maximum:1000000}) @IsOptional() @IsInt() @Min(0) @Max(1000000) capacityVirtual!:number|null;
 @ApiProperty({enum:['in_person','virtual'],isArray:true}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique() @IsIn(['in_person','virtual'],{each:true}) modalities!:('in_person'|'virtual')[];
 @ApiProperty({type:[CategoryDto]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>CategoryDto) categories!:CategoryDto[];
}
export class RevisionDto {@ApiProperty({type:Number,minimum:0}) @IsInt() @Min(0) revision!:number;}
export class SaveRegistrationDto extends RevisionDto {@ApiProperty({type:ContentDto}) @IsDefined() @ValidateNested() @Type(()=>ContentDto) content!:ContentDto;}
export class ApplyRegistrationDto extends RevisionDto {
 @ApiProperty() @IsUUID() publicationId!:string;
 @ApiProperty() @IsUUID() categoryId!:string;
 @ApiProperty() @IsIn(['in_person','virtual']) modality!:('in_person'|'virtual');
 @ApiProperty() @IsBoolean() confirmed!:boolean;
}
export class RegistrationDecisionDto extends RevisionDto {
 @ApiProperty() @IsIn(['approve','reject','cancel','restore']) action!:('approve'|'reject'|'cancel'|'restore');
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
export class RegistrationQuery {
 @ApiPropertyOptional({enum:REGISTRATION_STATES}) @IsOptional() @IsIn(REGISTRATION_STATES) status?:typeof REGISTRATION_STATES[number];
 @ApiProperty() @IsString() @MaxLength(120) q='';
 @ApiProperty() @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit=20;
 @ApiProperty() @Type(()=>Number) @IsInt() @Min(0) @Max(1000000) offset=0;
}
