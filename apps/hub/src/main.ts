import './load-env.js';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { corsOrigin } from './cors.js';
import { getEnv } from './env.js';

const env = getEnv();
const app = await NestFactory.create(AppModule);

app.setGlobalPrefix('api');
app.enableCors({ origin: corsOrigin(env.DASHBOARD_ORIGIN) });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.enableShutdownHooks();

// No host: Node binds "::" dual-stack, so LAN IPv4 clients and "localhost" (often ::1 on Windows) both reach the hub.
await app.listen(env.PORT);
console.log(`hub listening on :${env.PORT}`);
