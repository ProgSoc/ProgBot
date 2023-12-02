ALTER TABLE "guilds" ADD COLUMN "aoc_leaderboard_url" text;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "aoc_session_cookie" text;--> statement-breakpoint
ALTER TABLE "discordUsers" DROP COLUMN IF EXISTS "access_token";