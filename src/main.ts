import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DiscordModule } from './discord.module';
import mainLogger from './logger';
import { Signales } from '@dynamicabot/signales';
import { LoggerService } from '@nestjs/common';
// import { resolveDynamicProviders } from 'nestjs-dynamic-providers';

async function bootstrap() {
  // await resolveDynamicProviders();
  const app = await NestFactory.create(DiscordModule, {
    logger: mainLogger,
  });
  await app.listen(3000);
}
bootstrap();
