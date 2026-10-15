import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
export class IssueDto {
  @ApiProperty() field!: string;
  @ApiProperty({ type: [String] }) codes!: string[];
}
export class ErrorDetailDto {
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ format: 'uuid' }) requestId!: string;
  @ApiPropertyOptional({ type: [IssueDto] }) issues?: IssueDto[];
}
export class ErrorDto { @ApiProperty({ type: ErrorDetailDto }) error!: ErrorDetailDto }
export const ApiErrors = () => applyDecorators(...[400, 401, 403, 404, 409, 500, 503].map((status) =>
  ApiResponse({ status, type: ErrorDto, description: 'Error normalizado; mensaje según Accept-Language, código estable.' })));
