DO $$ BEGIN
 CREATE TYPE "membership_type" AS ENUM('Staff', 'Student', 'Alumni', 'Public');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discordUsers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"access_token" text,
	"refresh_token" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guilds" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"member_role" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"guild_id" text NOT NULL,
	"email" text,
	"phone" text,
	"name" text NOT NULL,
	"type" "membership_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"user_id" text,
	CONSTRAINT memberships_guild_id_email PRIMARY KEY("guild_id","email")
);
--> statement-breakpoint
DROP TABLE "course";--> statement-breakpoint
DROP TABLE "major";--> statement-breakpoint
DROP TABLE "subject";--> statement-breakpoint
DROP TABLE "submajor";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_discordUsers_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "discordUsers"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
