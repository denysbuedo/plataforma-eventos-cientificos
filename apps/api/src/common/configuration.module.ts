import { Global, Module, type DynamicModule } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config.js';
@Global()
@Module({})
export class ConfigurationModule {
  static register(config: AppConfig): DynamicModule {
    return { module: ConfigurationModule, providers: [{ provide: APP_CONFIG, useValue: config }], exports: [APP_CONFIG] };
  }
}
