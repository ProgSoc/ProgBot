ALTER TABLE "guilds" ADD COLUMN "gh_organisation" text;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "gh_api_token" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "cased_email" text;