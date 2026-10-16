import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateBy, ValidateNested } from 'class-validator';
import type { ContributionType, PublishedScientificCall, ScientificCallContent, ScientificCallDraft, ScientificTrack } from '@sep/contracts';

export class TrackDto implements ScientificTrack {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id!: string;
  @ApiProperty() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(150) nameEs!: string;
  @ApiProperty() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(150) nameEn!: string;
}
export class ContributionTypeDto extends TrackDto implements ContributionType {
  @ApiProperty({ minimum: 10, maximum: 10000 }) @IsInt() @Min(10) @Max(10000) abstractMinWords!: number;
  @ApiProperty({ minimum: 10, maximum: 10000 }) @IsInt() @Min(10) @Max(10000) abstractMaxWords!: number;
  @ApiProperty({ minimum: 0, maximum: 20 }) @IsInt() @Min(0) @Max(20) keywordsMin!: number;
  @ApiProperty({ minimum: 0, maximum: 20 }) @IsInt() @Min(0) @Max(20) keywordsMax!: number;
  @ApiProperty() @IsBoolean() manuscriptRequired!: boolean;
  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 500 })
  @ValidateBy({ name: 'maxPages', validator: { validate: (v: unknown) => v === null || typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 500 } }) maxPages!: number | null;
}
const validDate = (value: unknown) => value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && value >= '1900-01-01' && value <= '9999-12-31' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export class CallContentDto implements ScientificCallContent {
  @ApiProperty() @IsString() @MaxLength(200) titleEs!: string;
  @ApiProperty() @IsString() @MaxLength(200) titleEn!: string;
  @ApiProperty() @IsString() @MaxLength(6000) instructionsEs!: string;
  @ApiProperty() @IsString() @MaxLength(6000) instructionsEn!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) @ValidateBy({ name: 'dateOnly', validator: { validate: validDate } }) opensOn!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) @ValidateBy({ name: 'dateOnly', validator: { validate: validDate } }) closesOn!: string | null;
  @ApiProperty({ type: [TrackDto], maxItems: 50 }) @IsArray() @ArrayMaxSize(50) @ArrayUnique((item: ScientificTrack) => typeof item?.id === 'string' ? item.id.toLowerCase() : undefined) @ValidateNested({ each: true }) @Type(() => TrackDto) tracks!: TrackDto[];
  @ApiProperty({ type: [ContributionTypeDto], maxItems: 20 }) @IsArray() @ArrayMaxSize(20) @ArrayUnique((item: ContributionType) => typeof item?.id === 'string' ? item.id.toLowerCase() : undefined) @ValidateNested({ each: true }) @Type(() => ContributionTypeDto) contributionTypes!: ContributionTypeDto[];
}
export class SaveCallDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) revision!: number;
  @ApiProperty({ type: CallContentDto }) @ValidateNested() @Type(() => CallContentDto) content!: CallContentDto;
}
export class CallRevisionDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) revision!: number }
export class PublishedCallDto implements PublishedScientificCall {
  @ApiProperty({ type: CallContentDto }) content!: ScientificCallContent;
  @ApiProperty() timezone!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ format: 'date-time' }) publishedAt!: string;
}
export class CallDraftDto implements ScientificCallDraft {
  @ApiProperty({ type: CallContentDto }) content!: ScientificCallContent;
  @ApiProperty() revision!: number;
  @ApiProperty({ nullable: true, type: Number }) publishedRevision!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) publishedAt!: string | null;
  @ApiProperty() timezone!: string;
  @ApiProperty({ nullable: true, type: PublishedCallDto }) publication!: PublishedScientificCall | null;
}
