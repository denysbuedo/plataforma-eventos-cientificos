import { Body, Controller, Get, Module, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { AuditService } from '../common/audit.service.js';
import { ApiException, type SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from '../platform/context.guard.js';
import { AuthorWorkspaceDto, CreateWorkDto, SaveWorkDto, WorkDto } from './works.dto.js';
import { AuthorWorksService } from './works.service.js';
@ApiTags('author-works') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/my-works')
class AuthorWorksController {
  constructor(private readonly service: AuthorWorksService) {}
  @Get() @Access('author-work') @ApiOkResponse({ type: AuthorWorkspaceDto })
  get(@Req() req: SepRequest) { return this.service.get(req.security); }
  @Get(':workId') @Access('author-work') @ApiOkResponse({ type: WorkDto })
  read(@Req() req: SepRequest, @Param('workId') id: string) {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED'); return this.service.read(req.security, id);
  }
  @Post() @Access('author-work') @ApiCreatedResponse({ type: WorkDto })
  create(@Req() req: SepRequest, @Body() dto: CreateWorkDto) { return this.service.create(req.security, dto); }
  @Put(':workId') @Access('author-work') @ApiOkResponse({ type: WorkDto })
  save(@Req() req: SepRequest, @Param('workId') id: string, @Body() dto: SaveWorkDto) {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED'); return this.service.save(req.security, id, dto);
  }
}
@Module({ controllers: [AuthorWorksController], providers: [AuthorWorksService, AuditService] })
export class SubmissionsModule {}
