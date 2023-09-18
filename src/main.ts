import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DiscordModule } from './discord.module';
import mainLogger from './logger';
import passport from 'passport';
// import { resolveDynamicProviders } from 'nestjs-dynamic-providers';

async function bootstrap() {
  // await resolveDynamicProviders();
  const app = await NestFactory.create(DiscordModule, {
    logger: mainLogger,
  });

  app.use(passport.initialize());

  await app.listen(3000);
}
bootstrap();
