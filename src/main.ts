import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DiscordModule } from './discord.module';
import mainLogger from './logger';
import passport from 'passport';
import { ConfigService } from '@nestjs/config';
import { DiscordExceptionFilter } from './filters/DiscordFilter';
import { SentryFilter } from './filters/SentryFilter';
// import { resolveDynamicProviders } from 'nestjs-dynamic-providers';

async function bootstrap() {
  // await resolveDynamicProviders();
  const app = await NestFactory.create(DiscordModule, {
    logger: mainLogger,
  });

  const config = app.get(ConfigService);

  const dsn = config.get<string>('SENTRY_DSN');
  const version = config.get<string>('VERSION');

  if (dsn) {
    const sentry = await import('@sentry/node');
    const { RewriteFrames } = await import('@sentry/integrations');
    // const rootEsmFile = fileURLToPath(import.meta.url);
    // const rootEsmDir = path.dirname(rootEsmFile);
    Error.stackTraceLimit = Infinity;
    sentry.init({
      dsn,
      release: version,
      integrations: [
        new RewriteFrames({
          prefix: '/',
        }),
      ],
    });
  }

  app.useGlobalFilters(new DiscordExceptionFilter(), new SentryFilter());

  app.use(passport.initialize());

  await app.listen(3000);
}
bootstrap();
