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
@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return { module: AppModule, imports: [ConfigurationModule.register(config), DatabaseModule, IdentityModule, EventsModule, PlatformModule, ScienceModule],
      controllers: [HealthController], providers: [{ provide: APP_GUARD, useClass: ContextGuard }] };
  }
}
