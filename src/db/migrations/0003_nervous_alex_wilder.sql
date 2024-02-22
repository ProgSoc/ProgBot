ALTER TABLE "memberships" DROP CONSTRAINT "memberships_guild_id_email";--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_guild_id_email_pk" PRIMARY KEY("guild_id","email");--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "members_last_updated" date DEFAULT now();