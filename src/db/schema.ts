import { pgTable, text, unique } from 'drizzle-orm/pg-core';

export const subject = pgTable('subject', {
  id: text('id').primaryKey(),
});

export const major = pgTable('major', {
  id: text('id').primaryKey(),
});

export const submajor = pgTable('submajor', {
  id: text('id').primaryKey(),
});

export const course = pgTable('course', {
  id: text('id').primaryKey(),
});
