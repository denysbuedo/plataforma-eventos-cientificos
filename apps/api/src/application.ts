import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { localeFromHeader } from '@sep/i18n';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config.js';
import { ApiException, ApiExceptionFilter, type SepRequest } from './common/http.js';

export async function createApplication(config: AppConfig) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config), { logger: false });
  app.set('trust proxy', false);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.setGlobalPrefix('api/v1');
  app.use((request: SepRequest, response: import('express').Response, next: () => void) => {
    request.requestId = randomUUID();
    request.locale = localeFromHeader(request.headers['accept-language']);
    response.setHeader('x-request-id', request.requestId);
    response.setHeader('content-language', request.locale);
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true,
    forbidUnknownValues: true, validationError: { target: false, value: false },
    exceptionFactory: (errors) => new ApiException(400, 'VALIDATION_FAILED', errors.map((error) => ({ field: error.property, codes: Object.keys(error.constraints ?? {}) }))),
  }));
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('SEP API').setVersion('1.0.0')
    .setDescription('Fase 0: metadatos de eventos, dominios registrados y permisos contextuales. Autenticación de desarrollo; sin soporte productivo OIDC todavía.')
    .addBearerAuth({ type: 'http', scheme: 'bearer', description: 'Token opaco de desarrollo configurado en servidor; no transporta roles.' }).build());
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: '/api/v1/openapi.json', swaggerOptions: { persistAuthorization: false } });
  return { app, document };
}
