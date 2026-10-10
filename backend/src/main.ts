import {
  NestFactory,
} from '@nestjs/core';

import express from 'express';

import {
  AppModule,
} from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create(
      AppModule,
    );

  // Product reference photos
  // are sent as base64 data URIs.
  // Increase body limit so
  // images can reach NestJS.
  app.use(
    express.json({
      limit: '12mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '12mb',
    }),
  );

  await app.listen(
    process.env.PORT ??
      3000,
  );
}

bootstrap();