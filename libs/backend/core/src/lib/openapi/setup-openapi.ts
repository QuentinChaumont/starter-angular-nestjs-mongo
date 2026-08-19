import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';

export const OPENAPI_PATH = 'api/docs';

/**
 * Mounts Swagger UI and its JSON document, skipped entirely in production
 * so the API surface isn't published from a live environment.
 */
export function setupOpenApi(app: INestApplication): void {
  const config = app.get(AppConfigService);
  if (config.app.environment === 'production') {
    return;
  }

  const documentConfig = new DocumentBuilder()
    .setTitle('Starter API')
    .setDescription('API documentation for the Nx Angular + NestJS starter')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup(OPENAPI_PATH, app, document);
}
