import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { parseEnv } from './config/env';
import { loadEnvFileIfPresent } from './config/load-env-file';
import { configureApp } from './configure-app';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  loadEnvFileIfPresent();
  const env = parseEnv(process.env);

  // bufferLogs holds Nest's startup logs until the pino logger is attached, so every
  // line comes out as structured JSON.
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(env), {
    bufferLogs: true,
  });
  configureApp(app);
  setupSwagger(app);

  await app.listen(env.PORT, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
