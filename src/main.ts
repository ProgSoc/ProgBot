import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DiscordModule } from './discord.module';
// import { resolveDynamicProviders } from 'nestjs-dynamic-providers';

async function bootstrap() {
  // await resolveDynamicProviders();
  const app = await NestFactory.create(DiscordModule, {
    logger: false,
  });
  await app.init();
}
bootstrap();
