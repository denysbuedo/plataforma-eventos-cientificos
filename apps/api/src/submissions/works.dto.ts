import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { AuthorWork, AuthorWorkSummary, AuthorWorkspace, PublishedScientificCall } from '@sep/contracts';
import { PublicEventDto } from '../events/event.dto.js';
import { PublishedCallDto } from '../science/call.dto.js';
export class CreateWorkDto {
  @ApiProperty({ minLength: 3, maxLength: 300 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @ApiProperty({ enum: ['es','en'] }) @IsIn(['es','en']) language!: 'es' | 'en';
  @ApiProperty({ format: 'uuid' }) @IsUUID() trackId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() contributionTypeId!: string;
}
export class SaveWorkDto extends CreateWorkDto {
  @ApiProperty({ maxLength: 50000 }) @IsString() @MaxLength(50000) abstract!: string;
  @ApiProperty({ type: [String], maxItems: 20 }) @IsArray() @ArrayMaxSize(20)
  @Transform(({ value }) => Array.isArray(value) ? value.map((v: unknown) => typeof v === 'string' ? v.trim() : v) : value)
  @ArrayUnique((v: unknown) => typeof v === 'string' ? v.toLowerCase() : v) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(80, { each: true }) keywords!: string[];
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) revision!: number;
}
export class WorkSummaryDto implements AuthorWorkSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['es','en'] }) language!: 'es' | 'en';
  @ApiProperty({ format: 'uuid' }) trackId!: string;
  @ApiProperty({ format: 'uuid' }) contributionTypeId!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
export class WorkDto extends WorkSummaryDto implements AuthorWork {
  @ApiProperty() abstract!: string;
  @ApiProperty({ type: [String] }) keywords!: string[];
  @ApiProperty({ type: PublishedCallDto }) call!: PublishedScientificCall;
}
export class AuthorWorkspaceDto implements AuthorWorkspace {
  @ApiProperty({ type: [String], enum: ['es','en'] }) languages!: ('es' | 'en')[];
  @ApiProperty({ type: PublicEventDto }) event!: PublicEventDto;
  @ApiProperty({ type: [WorkSummaryDto] }) works!: AuthorWorkSummary[];
  @ApiProperty({ type: PublishedCallDto, nullable: true }) call!: PublishedScientificCall | null;
  @ApiProperty() editable!: boolean;
  @ApiProperty({ enum: ['available','no_call','closed','inactive'] }) reason!: AuthorWorkspace['reason'];
}
