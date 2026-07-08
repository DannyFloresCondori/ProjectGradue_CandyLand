import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/all-exceptions.filters';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const logger = new Logger(AppModule.name);

  //global exception filter = maneja todo los errores
  app.useGlobalFilters(new AllExceptionsFilter());

  //Global prefix desde el archivo .env
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(helmet());

  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  //global validacion pipe para DTOS
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  //Iniciar el servidor y muestrar el puerto en el que se esta ejecutando
  const port = configService.get<string>('PORT', '3002');
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Base URL: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
