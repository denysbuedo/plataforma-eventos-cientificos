import {EditorialModule} from './editorial/editorial.module.js';
import {CommunicationsModule} from './communications/communications.module.js';
import {CertificatesModule} from './certificates/certificates.module.js';
import {AttendanceModule} from './attendance/attendance.module.js';
import {RegistrationModule} from './registrations/registration.module.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { AppConfig } from './config.js';
import { ConfigurationModule } from './common/configuration.module.js';
import { DatabaseModule } from './database/database.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { EventsModule } from './events/events.module.js';
import { ContextGuard } from './platform/context.guard.js';
import { PlatformModule } from './platform/platform.module.js';
import { HealthController } from './health.controller.js';
import { ScienceModule } from './science/science.module.js';
import {ProgramModule} from './program/program.module.js';
import { SubmissionsModule } from './submissions/submissions.module.js';
@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return { module: AppModule, imports: [ConfigurationModule.register(config), DatabaseModule, IdentityModule, EventsModule, PlatformModule, ScienceModule, SubmissionsModule, ProgramModule, RegistrationModule, AttendanceModule, CertificatesModule, CommunicationsModule, EditorialModule],
      controllers: [HealthController], providers: [{ provide: APP_GUARD, useClass: ContextGuard }] };
  }
}
