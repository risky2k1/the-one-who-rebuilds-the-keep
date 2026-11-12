import { Module, type DynamicModule } from '@nestjs/common';
import { CoreModule, type CoreModuleOptions } from '@keep/core';
import { HealthController } from './health.controller.js';

/**
 * Root application module mounting health checks and the core subsystem.
 */
@Module({
  controllers: [HealthController],
})
export class AppModule {
  static forRoot(coreOptions: CoreModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule.forRoot(coreOptions)],
      controllers: [HealthController],
    };
  }
}
