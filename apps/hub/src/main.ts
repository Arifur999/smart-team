import './load-env.js';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { getEnv } from './env.js';

const env = getEnv();
const app = await NestFactory.create(AppModule);

app.setGlobalPrefix('api');
app.enableCors({ origin: env.DASHBOARD_ORIGIN });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.enableShutdownHooks();

// 0.0.0.0 so the other PCs on the LAN can reach the hub.
await app.listen(env.PORT, '0.0.0.0');
console.log(`hub listening on :${env.PORT}`);
