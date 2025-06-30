import { NestFactory } from '@nestjs/core';
import {
  HttpException,
  HttpStatus,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const whitelist = configService.get<string>('CORS_WHITELIST')?.split(',') || [
    '*',
  ];

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: whitelist.includes('*')
      ? true
      : (origin, callback) => {
          if (!origin) {
            return callback(null, true);
          }
          if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(
              new HttpException('Not allowed by CORS', HttpStatus.FORBIDDEN),
            );
          }
        },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-RapidAPI-Key',
      'X-RapidAPI-Host',
    ],
  });

  await app.listen(port);
  logger.log(`🚀 Bitcoin Market Intelligence API is running on port ${port}`);
  logger.log(
    `📊 API endpoint: http://localhost:${port}/api/v1/bitcoin/analysis`,
  );
}
void bootstrap();
