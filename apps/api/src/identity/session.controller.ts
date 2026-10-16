import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import { AuthorizationService } from './authorization.service.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import type { SessionView } from '@sep/contracts';
import { DatabaseService } from '../database/database.service.js';
import { people, affiliations, orcidConnections } from '../database/schema.js';
import { OrcidService } from './orcid.controller.js';
import { and, eq } from 'drizzle-orm';
import { ApiException } from '../common/http.js';

class PersonDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}
class AuthorProfileDto extends PersonDto {
  @ApiProperty() email!: string;
  @ApiProperty({type:[String]}) institutions!: string[];
  @ApiProperty({type:Object,nullable:true}) orcid!: {id:string;environment:string;connectedAt:string}|null;
  @ApiProperty() orcidAvailable!:boolean;
}
class ProfileDto { @ApiProperty({ type: AuthorProfileDto }) person!: AuthorProfileDto }
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
  constructor(private readonly authorization: AuthorizationService, private readonly database: DatabaseService,private readonly orcid:OrcidService) {}
  @Get('me') @Access('identity-read') @ApiOkResponse({ type: ProfileDto })
  me(@Req() request: SepRequest) {
    return this.database.scoped(request.security, async (tx) => {
      const [person] = await tx.select({ id: people.id, name: people.name }).from(people).where(and(eq(people.id, request.security.personId!), eq(people.active, true)));
      if (!person) throw new ApiException(401, 'UNAUTHORIZED');
      const institutions = await tx.select({institution:affiliations.institution}).from(affiliations).where(eq(affiliations.personId,person.id));
      const [connection]=await tx.select({id:orcidConnections.orcid,environment:orcidConnections.environment,connectedAt:orcidConnections.connectedAt}).from(orcidConnections).where(eq(orcidConnections.personId,person.id));
      return { person: {...person,email:request.security.verifiedEmail ?? '',institutions:institutions.map(item=>item.institution),orcidAvailable:this.orcid.available(),orcid:connection?.id&&connection.connectedAt?{id:connection.id,environment:connection.environment,connectedAt:connection.connectedAt.toISOString()}:null} };
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
