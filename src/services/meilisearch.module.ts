import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import mainLogger from 'src/logger';

export const MEILI_TOKEN = Symbol('MEILI_TOKEN');

@Global()
@Module({
  providers: [
    {
      provide: MEILI_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const searchClient = new MeiliSearch({
          host: configService.getOrThrow<string>('MEILI_URL'),
          apiKey: configService.getOrThrow<string>('MEILI_MASTER_KEY'),
        });
        return searchClient;
      },
    },
  ],
  exports: [MEILI_TOKEN],
})
export class MeiliSearchModule {}
