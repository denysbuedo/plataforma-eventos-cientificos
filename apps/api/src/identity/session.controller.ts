import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import { AuthorizationService } from './authorization.service.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import type { SessionView } from '@sep/contracts';
import { DatabaseService } from '../database/database.service.js';
import { people } from '../database/schema.js';
import { and, eq } from 'drizzle-orm';
import { ApiException } from '../common/http.js';

class PersonDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}
class ProfileDto { @ApiProperty({ type: PersonDto }) person!: PersonDto }
class SessionDto implements SessionView {
  @ApiProperty({ type: PersonDto }) person!: PersonDto;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) eventId!: string | null;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() canRead!: boolean;
  @ApiProperty() canEdit!: boolean;
  @ApiProperty() organizationAdmin!: boolean;
}
@ApiTags('identity') @ApiBearerAuth() @ApiErrors() @Controller()
export class SessionController {
  constructor(private readonly authorization: AuthorizationService, private readonly database: DatabaseService) {}
  @Get('me') @Access('identity-read') @ApiOkResponse({ type: ProfileDto })
  me(@Req() request: SepRequest) {
    return this.database.scoped(request.security, async (tx) => {
      const [person] = await tx.select({ id: people.id, name: people.name }).from(people).where(and(eq(people.id, request.security.personId!), eq(people.active, true)));
      if (!person) throw new ApiException(401, 'UNAUTHORIZED'); return { person };
    });
  }
  @Get(['session', 'events/:eventId/session']) @Access('session-read') @ApiOkResponse({ type: SessionDto })
  get(@Req() request: SepRequest): Promise<SessionView> {
    const context = request.security;
    return this.authorization.run(context, 'session-read', async (_tx, permissions) => ({
      person: { id: context.personId!, name: permissions.personName }, organizationId: context.organizationId, eventId: context.eventId,
      roles: permissions.roles, canRead: permissions.organizationAdmin || permissions.organizer,
      canEdit: permissions.organizer, organizationAdmin: permissions.organizationAdmin,
    }));
  }
}
