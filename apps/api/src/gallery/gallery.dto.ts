import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,MaxLength,Min,MinLength} from 'class-validator';
export class PosterRevisionDto{@ApiProperty() @IsInt() @Min(0) revision!:number;@ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) reason!:string;}
export class PosterPermissionDto extends PosterRevisionDto{@ApiProperty() @IsBoolean() attested!:boolean;@ApiProperty() @IsBoolean() authorized!:boolean;@ApiProperty({enum:['all-rights-reserved','CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0']}) @IsIn(['all-rights-reserved','CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0']) license!:'all-rights-reserved'|'CC-BY-4.0'|'CC-BY-SA-4.0'|'CC-BY-NC-4.0';@ApiProperty() @IsBoolean() showDownload!:boolean;@ApiProperty({nullable:true,type:String}) @IsOptional() @IsString() @MaxLength(88000) thumbnail!:string|null;@ApiProperty() @IsString() @MaxLength(500) altText!:string;}
export class PosterApprovalDto extends PosterRevisionDto{@ApiProperty() @IsBoolean() approved!:boolean;@ApiProperty() @IsString() @MaxLength(1500) note!:string;}
export class PosterPublishDto extends PosterRevisionDto{@ApiProperty() @IsUUID() requestId!:string;}
