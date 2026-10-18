import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsIn,IsInt,IsISO8601,IsOptional,IsString,IsUUID,Matches,MaxLength,Min,MinLength} from 'class-validator';
import {RegistrationQuery,RevisionDto} from '../registrations/registration.dto.js';
export class AttendanceQuery extends RegistrationQuery{}
export class CredentialRevisionDto extends RevisionDto{}
export class CredentialLookupDto {@ApiProperty() @IsString() @Matches(/^[a-f0-9]{48}$/) code!:string;}
export class CheckInDto {
 @ApiProperty({enum:['event','session']}) @IsIn(['event','session']) target!:'event'|'session';
 @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() sessionId?:string;
 @ApiPropertyOptional({format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/) observedAt?:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
export class CorrectAttendanceDto {
 @ApiProperty() @IsInt() @Min(1) revision!:number;
 @ApiProperty({enum:['present','voided']}) @IsIn(['present','voided']) state!:'present'|'voided';
 @ApiPropertyOptional({format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/) observedAt?:string;
 @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) reason!:string;
}
