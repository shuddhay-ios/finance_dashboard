import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export const DOCS_PATH = 'api/docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Finance Dashboard API')
    .setDescription('Transactions, analytics and CSV export for the financial analytics dashboard')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Request/response docs are generated from the same zod schemas that validate traffic,
  // so the docs can't drift from what the API actually accepts.
  SwaggerModule.setup(DOCS_PATH, app, cleanupOpenApiDoc(document));
}
