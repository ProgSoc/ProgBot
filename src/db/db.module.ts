import { Global, Logger, Module } from '@nestjs/common';
import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import mainLogger from 'src/logger';
import { fileURLToPath } from 'url';

export const DATABASE_TOKEN = Symbol('DRIZZLE_TOKEN');

const rootFilePath = fileURLToPath(import.meta.url);
const migrationsFolder = path.join(rootFilePath, '../db/migrations');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = mainLogger.child(DatabaseModule.name);
        const username = configService.getOrThrow('POSTGRES_USER');
        const password = configService.getOrThrow('POSTGRES_PASSWORD');
        const host = configService.getOrThrow('POSTGRES_HOST');
        const database = configService.getOrThrow('POSTGRES_DB');

        const migrationPgClient = postgres(
          `postgres://${username}:${password}@${host}/${database}`,
          {
            max: 1,
          },
        );

        logger.success('Connected to database');
        const migrationClient = drizzle(migrationPgClient, {
          schema,
          logger: false,
        });
        await migrate(migrationClient, { migrationsFolder });
        logger.success('Migrated database');

        const queryPgClient = postgres(
          `postgres://${username}:${password}@${host}/${database}`,
          {
            transform: {
              value(value) {
                if (value instanceof Date) {
                  return value.toISOString();
                } else {
                  return value;
                }
              },
            },
          },
        );

        const db = drizzle(queryPgClient, { schema });

        return db;
      },
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule {}

export type Database = PostgresJsDatabase<typeof schema>;
