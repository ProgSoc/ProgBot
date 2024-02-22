import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Global, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type Cache } from "cache-manager";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "src/db/db.module";
import { guilds } from "src/db/schema";
import { z } from "zod";

/**
 * The AoC service is responsible for setting up AoC for a guild and managing the leaderboard
 */
@Global()
@Injectable()
export class AoCService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  /**
   *
   * @param guildId The Id of the guild the setup info was added in
   * @param leaderboardUrl The provided leaderboard url
   * @param sessionToken The provided session token
   */
  public async setup(
    guildId: string,
    leaderboardUrl: string,
    sessionToken: string,
  ) {
    // set the guilds leaderboard url and session token
    await this.db
      .insert(guilds)
      .values({
        guildId,
        aocLeaderboardUrl: leaderboardUrl,
        aocSessionCookie: sessionToken,
      })
      .onConflictDoUpdate({
        set: {
          aocLeaderboardUrl: leaderboardUrl,
          aocSessionCookie: sessionToken,
        },
        target: guilds.guildId,
      });
  }

  /**
   * Get the leaderboard for a guild
   * @param guildId The Id of the guild to get the leaderboard for
   * @returns The leaderboard for the guild (cached for 20 minutes)
   */
  public async getLeaderboard(guildId: string) {
    const cacheKey = `aoc-leaderboard-${guildId}`;
    // 20 min ttl in milliseconds
    const ttl = 20 * 60 * 1000;

    const cachedLeaderboardRaw = await this.cacheManager.get(cacheKey);

    try {
      // validate the cached leaderboard
      const cachedLeaderboard =
        await LeaderboardSchema.parseAsync(cachedLeaderboardRaw);
      return cachedLeaderboard;
    } catch (error) {
      // if the cached leaderboard is invalid, fetch a new one
      const leaderboard = await this.fetchLeaderboard(guildId);
      // cache the new leaderboard
      await this.cacheManager.set(cacheKey, leaderboard, ttl);
      return leaderboard;
    }
  }

  /**
   * Fetch the leaderboard for a guild
   * @param guildId The Id of the guild to fetch the leaderboard for
   * @returns The leaderboard for the guild
   */
  public async fetchLeaderboard(guildId: string) {
    const [guild] = await this.db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId));

    if (!guild) {
      throw new Error("Guild not found");
    }

    const leaderboardUrl = guild.aocLeaderboardUrl;
    const sessionToken = guild.aocSessionCookie;

    if (!leaderboardUrl || !sessionToken) {
      throw new Error("Leaderboard url or session token not found");
    }

    const leaderboard = await fetch(leaderboardUrl, {
      headers: {
        cookie: `session=${sessionToken}`,
      },
    }).then((res) => res.json());

    const validatedLeaderboard =
      await LeaderboardSchema.parseAsync(leaderboard);

    return validatedLeaderboard;
  }
}

const CompletionDayLevelSchema = z.object({
  star_index: z.number(),
  get_star_ts: z.number(),
});

const LeaderboardMemberSchema = z.object({
  name: z.string().nullable(),
  local_score: z.number(),
  global_score: z.number(),
  id: z.number(),
  last_star_ts: z.number(),
  stars: z.number(),
  completion_day_level: z.record(z.record(CompletionDayLevelSchema)),
});

const LeaderboardSchema = z.object({
  event: z.string(),
  owner_id: z.number(),
  members: z.record(LeaderboardMemberSchema),
});

export type Leaderboard = z.infer<typeof LeaderboardSchema>;
