import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Access } from './platform/context.guard.js';
import { DatabaseService } from './database/database.service.js';
import { ApiException } from './common/http.js';
import { ApiErrors } from './common/openapi.js';
class HealthDto { @ApiProperty({ enum: ['ok'] }) status!: 'ok' }
@ApiTags('health') @ApiErrors() @Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get() @Access('health') @ApiOkResponse({ type: HealthDto })
  async health(): Promise<HealthDto> {
    try { await this.database.health(); return { status: 'ok' }; }
    catch { throw new ApiException(503, 'DATABASE_UNAVAILABLE'); }
  }
}
