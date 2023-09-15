import { pgTable, text, unique } from 'drizzle-orm/pg-core';

export const guilds = pgTable('guilds', {
  /** The Guild Id */
  id: text('id').primaryKey(),
  /** The announcement channel Id */
  announcementChannel: text('announcement_channel'),
});
