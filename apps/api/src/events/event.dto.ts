import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateBy, ValidateIf } from 'class-validator';
import type { EventView, PublicEventView } from '@sep/contracts';

export class CreateEventDto {
  @ApiProperty({ minLength: 3, maxLength: 200, pattern: '\\S' }) @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/u)
  nameEs!: string;
  @ApiProperty({ minLength: 3, maxLength: 200, pattern: '\\S' }) @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/u)
  nameEn!: string;
  @ApiProperty({ example: 'America/Havana' }) @IsString()
  @ValidateBy({ name: 'isTimezone', validator: { validate: (value: unknown) => {
    if (typeof value !== 'string') return false;
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  } } })
  timezone!: string;
}
export class UpdateEventDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200, pattern: '\\S' }) @ValidateIf((_, value) => value !== undefined)
  @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/u)
  nameEs?: string;
  @ApiPropertyOptional({ minLength: 3, maxLength: 200, pattern: '\\S' }) @ValidateIf((_, value) => value !== undefined)
  @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/u)
  nameEn?: string;
}
export class ListEventsQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;
  @ApiPropertyOptional({ minimum: 0, maximum: 10000, default: 0 }) @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  offset: number = 0;
}
export class EventDto implements EventView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() nameEs!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty({ enum: ['draft', 'published', 'archived'] }) status!: EventView['status'];
}
export class PublicEventDto implements PublicEventView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nameEs!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() timezone!: string;
}
export class EventPageDto {
  @ApiProperty({ type: [EventDto] }) data!: EventDto[];
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
