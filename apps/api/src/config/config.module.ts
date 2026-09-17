import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { Env } from './env';

/** Injection token: `@Inject(ENV) env: Env` gives any class the validated settings. */
export const ENV = Symbol('ENV');

@Global()
@Module({})
export class ConfigModule {
  // The env is parsed once in main.ts before Nest starts, so a bad setting fails with a
  // clear message instead of halfway through module initialisation.
  static register(env: Env): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: ENV, useValue: env }],
      exports: [ENV],
    };
  }
}
