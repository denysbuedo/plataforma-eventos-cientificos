import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsInt, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import type { SiteContent } from '@sep/contracts';
import { EventDto, PublicEventDto } from './event.dto.js';

export class SiteContentDto implements SiteContent {
  @ApiProperty({ maxLength: 24 }) @IsString() @MinLength(2) @MaxLength(24) acronym!: string;
  @ApiProperty({ enum: ['forest', 'ocean'] }) @IsIn(['forest', 'ocean']) theme!: SiteContent['theme'];
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) kickerEs!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) kickerEn!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(180) heroTitleEs!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(180) heroTitleEn!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(600) summaryEs!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(600) summaryEn!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(3000) aboutEs!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(3000) aboutEn!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(3000) callEs!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(3000) callEn!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(250) venueEs!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(250) venueEn!: string;
  @ApiProperty({ format: 'date' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) startDate!: string;
  @ApiProperty({ format: 'date' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) endDate!: string;
  @ApiProperty({ format: 'email' }) @IsEmail() @MaxLength(254) contactEmail!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsString({ each: true }) @MinLength(2, { each: true }) @MaxLength(50, { each: true }) topicsEs!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsString({ each: true }) @MinLength(2, { each: true }) @MaxLength(50, { each: true }) topicsEn!: string[];
}
export class SaveSiteDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
  @ApiProperty({ type: SiteContentDto }) @ValidateNested() @Type(() => SiteContentDto) content!: SiteContentDto;
}
export class PublishSiteDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) revision!: number }
export class PublishedSiteDto {
  @ApiProperty({ type: PublicEventDto }) event!: PublicEventDto;
  @ApiProperty({ type: SiteContentDto }) content!: SiteContentDto;
  @ApiProperty() revision!: number;
  @ApiProperty({ format: 'date-time' }) publishedAt!: string;
}
export class SiteDraftDto {
  @ApiProperty({ type: EventDto }) event!: EventDto;
  @ApiProperty({ type: SiteContentDto }) content!: SiteContentDto;
  @ApiProperty() revision!: number;
  @ApiProperty({ nullable: true }) publishedRevision!: number | null;
  @ApiProperty({ nullable: true, format: 'date-time' }) publishedAt!: string | null;
}
