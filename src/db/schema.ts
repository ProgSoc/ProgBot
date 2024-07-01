import { relations } from "drizzle-orm";
import {
  date,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const guilds = pgTable("guilds", {
  /** The Guild Id */
  guildId: text("guild_id").primaryKey(),
  /** Member Role */
  memberRole: text("member_role"),
  /** Advent of code leaderboard url */
  aocLeaderboardUrl: text("aoc_leaderboard_url"),
  /** Advent of code session cookie */
  aocSessionCookie: text("aoc_session_cookie"),
  /** Members Last Updated */
  membersLastUpdated: date("members_last_updated", {
    mode: "string",
  }).defaultNow(),
  /** Github organisation as it appears in URL */
  ghOrganisation: text("gh_organisation"),
  /** Github API Token */
  ghApiToken: text("gh_api_token"),
});

export const membershipTypeEnum = pgEnum("membership_type", [
  "Staff",
  "Student",
  "Alumni",
  "Public",
]);

export const discordUsers = pgTable("discordUsers", {
  /** The Discord User Id */
  userId: text("user_id").primaryKey(),
  /** Refresh token */
  refreshToken: text("refresh_token"),
});

export const discordUsersRelations = relations(discordUsers, ({ one }) => ({
  guild: one(guilds, {
    fields: [discordUsers.userId],
    references: [guilds.guildId],
  }),
}));

export const memberships = pgTable(
  "memberships",
  {
    /** The Guild Id */
    guildId: text("guild_id")
      .references(() => guilds.guildId)
      .notNull(),
    /** The lowercased-email of the member */
    email: text("email"),
    /** The email of the member, with the case specified when signing up. */
    casedEmail: text("cased_email"),
    /** The phone number */
    phone: text("phone"),
    /** The name of the member */
    name: text("name").notNull(), // This is in the format, "First|Preferred Last"
    /** The type of membership */
    type: membershipTypeEnum("type").notNull(),
    /** Joined Date, the earliest date that the member is in the memberships list */
    start_date: date("start_date", {
      mode: "string",
    }).notNull(),
    /** End Date */
    end_date: date("end_date", {
      mode: "string",
    }).notNull(),
    /** The Discord User Id if linked */
    userId: text("user_id").references(() => discordUsers.userId),
  },
  (table) => {
    return {
      pk: primaryKey(table.guildId, table.email),
    };
  }
);

export const membershipsRelations = relations(memberships, ({ one }) => ({
  guild: one(guilds, {
    fields: [memberships.guildId],
    references: [guilds.guildId],
  }),
  discordUser: one(discordUsers, {
    fields: [memberships.userId],
    references: [discordUsers.userId],
  }),
}));
