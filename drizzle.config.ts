import type { Config } from 'drizzle-kit';
import { z } from 'zod';
import { config } from 'dotenv';
config();

const DBCredentialsSchema = z.object({
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
});

export type DBCredentials = z.infer<typeof DBCredentialsSchema>;

const dbCredentials = DBCredentialsSchema.parse(process.env);
const connectionString = `postgres://${dbCredentials.POSTGRES_USER}:${dbCredentials.POSTGRES_PASSWORD}@${dbCredentials.POSTGRES_HOST}/${dbCredentials.POSTGRES_DB}`;

export default {
  schema: './src/db/schema.ts',
  driver: 'pg',
  dbCredentials: {
    connectionString,
    ...dbCredentials,
  },
  out: './src/db/migrations',
} satisfies Config;
