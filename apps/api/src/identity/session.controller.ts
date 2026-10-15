import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import { AuthorizationService } from './authorization.service.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import type { SessionView } from '@sep/contracts';

class PersonDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}
class SessionDto implements SessionView {
  @ApiProperty({ type: PersonDto }) person!: PersonDto;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) eventId!: string | null;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() canRead!: boolean;
  @ApiProperty() canEdit!: boolean;
  @ApiProperty() organizationAdmin!: boolean;
}
@ApiTags('identity') @ApiBearerAuth() @ApiErrors() @Controller('session')
export class SessionController {
  constructor(private readonly authorization: AuthorizationService) {}
  @Get() @Access('session-read') @ApiOkResponse({ type: SessionDto })
  get(@Req() request: SepRequest): Promise<SessionView> {
    const context = request.security;
    return this.authorization.run(context, 'session-read', async (_tx, permissions) => ({
      person: { id: context.personId!, name: permissions.personName }, organizationId: context.organizationId, eventId: context.eventId,
      roles: permissions.roles, canRead: permissions.organizationAdmin || permissions.organizer,
      canEdit: permissions.organizer, organizationAdmin: permissions.organizationAdmin,
    }));
  }
}
