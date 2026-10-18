import {Type} from 'class-transformer';
import {IsBoolean,IsIn,IsInt,IsOptional,IsString,Max,MaxLength,Min,MinLength,IsUUID} from 'class-validator';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
export class NotificationQuery {
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
 @ApiPropertyOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(1000000) offset=0;
 @ApiPropertyOptional({enum:['all','unread']}) @IsIn(['all','unread']) filter:'all'|'unread'='all';
}
export class MailQuery extends NotificationQuery {
 @ApiPropertyOptional({enum:['pending','processing','retry','sent','failed','suppressed','blocked']}) @IsOptional() @IsIn(['pending','processing','retry','sent','failed','suppressed','blocked']) status?:'pending'|'processing'|'retry'|'sent'|'failed'|'suppressed'|'blocked';
}
export class SaveNotificationPreferencesDto {
 @ApiProperty() @IsInt() @Min(0) revision!:number;
 @ApiProperty() @IsBoolean() emailEnabled!:boolean;
 @ApiProperty() @IsBoolean() optionalEmail!:boolean;
 @ApiProperty({enum:['es','en']}) @IsIn(['es','en']) locale!:'es'|'en';
}
export class MarkNotificationDto { @ApiProperty() @IsBoolean() read!:boolean; }
export class AnnouncementDto {
 @ApiProperty({format:'uuid'}) @IsUUID() id!:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) messageEs!:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) messageEn!:string;
 @ApiProperty({enum:['registrants','reviewers']}) @IsIn(['registrants','reviewers']) audience!:'registrants'|'reviewers';
 @ApiProperty({enum:['operational','optional']}) @IsIn(['operational','optional']) category!:'operational'|'optional';
}
