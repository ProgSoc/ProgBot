import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Global, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type Cache } from "cache-manager";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "src/db/db.module";
import { guilds } from "src/db/schema";
import { Octokit } from "@octokit/rest";
import { time } from "console";

/**
 * The GH service is responsible for setting up GH for a guild and managing the leaderboard
 */
@Global()
@Injectable()
export class GHService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly db: Database
  ) {}

  /**
   * Store the organisation name and api token for the guild
   * @param guildId The ID of the guild the setup info was added in
   * @param organisationName The provided Github organisation name
   * @param apiToken The provided Github API token
   */
  public async setup(
    guildId: string,
    organisationName: string,
    apiToken: string
  ) {
    await this.db
      .insert(guilds)
      .values({
        guildId,
        ghApiToken: apiToken,
        ghOrganisation: organisationName,
      })
      .onConflictDoUpdate({
        set: {
          ghApiToken: apiToken,
          ghOrganisation: organisationName,
        },
        target: guilds.guildId,
      });
  }

  /**
   * @param guildId The ID of the guild to get the organisation for
   * @returns The organisation name or null if an error occurred
   */
  public async get_organisation(guildId: string): Promise<string | null> {
    const [guild] = await this.db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId));

    if (!guild) {
      return null;
    }

    return guild.ghOrganisation;
  }

  /**
   * @param guildId The ID of the guild to get the contribution scores for
   * @param timespan The timespan to include PRs and issues from when calculating scores
   * @returns The contribution scores for the organisation or null if an error occurred
   */
  public async get_scores(
    guildId: string,
    timespan?: ContributionTimeSpan
  ): Promise<ContributionScores | null> {
    const [guild] = await this.db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId));

    if (!guild) {
      throw new Error("Guild not found");
    }

    const token = guild.ghApiToken;
    const organisation = guild.ghOrganisation;

    if (!token || !organisation) {
      return null;
    }

    try {
      const octokit = new Octokit({ auth: token });

      const repos = await organisationRepositories(organisation, octokit);

      let items = (
        await Promise.all(
          repos.map(async (repo) => {
            const prs = await repositoryPullRequests(
              organisation,
              repo,
              octokit
            );
            const issues = await repositoryIssues(organisation, repo, octokit);
            return [...prs, ...issues];
          })
        )
      ).flat();

      if (timespan) {
        if (timespan.start !== undefined) {
          items = items.filter((item) => item.dateCreated >= timespan.start!);
        }
        if (timespan.end !== undefined) {
          items = items.filter((item) => item.dateCreated <= timespan.end!);
        }
      }

      const scores: ContributionScores = {
        organisation,
        members: {},
      };

      for (const item of items) {
        if (!scores.members[item.author]) {
          scores.members[item.author] = {
            githubUsername: item.author,
            score: 0,
            mergedPrs: 0,
            createdIssues: 0,
          };
        }

        scores.members[item.author].score += scoreOf(item);
        if ("merged" in item) {
          if (item.merged) {
            scores.members[item.author].mergedPrs++;
          }
        } else {
          scores.members[item.author].createdIssues++;
        }
      }

      return scores;
    } catch (e) {
      return null;
    }
  }
}

interface PullRequest {
  author: string;
  merged: boolean;
  dateCreated: Date;
  dateMerged?: Date;
}

interface Issue {
  author: string;
  dateCreated: Date;
}

function scoreOf(item: PullRequest | Issue): number {
  let score = 0;

  // If the item is a PR
  if ("merged" in item) {
    // Base score for PRs
    score += 2;

    if (item.merged) {
      // Bonus for merge
      score += 5;
    }
  } else {
    // Score for issues
    score += 1;
  }
  return score;
}

async function organisationRepositories(
  organisation: string,
  octokit: Octokit
): Promise<string[]> {
  const res = await octokit.repos.listForOrg({
    org: organisation,
    type: "public",
    per_page: 100,
  });

  return res.data.map((repo) => repo.name);
}

async function repositoryPullRequests(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<PullRequest[]> {
  let page = 1;
  let prs: PullRequest[] = [];

  while (true) {
    let res = await octokit.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 100,
      page: page++,
    });

    if (res.data.length === 0) {
      break;
    }

    prs.push(
      ...res.data
        .filter((pr) => pr.user?.type === "User")
        .map((pr) => ({
          author: pr.user?.login ?? "Unknown",
          merged: pr.merged_at !== null,
          dateCreated: new Date(pr.created_at),
          dateMerged: !pr.merged_at ? undefined : new Date(pr.merged_at),
        }))
    );
  }

  return prs;
}

async function repositoryIssues(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<Issue[]> {
  let page = 1;
  let issues: Issue[] = [];

  while (true) {
    let res = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 100,
      page: page++,
    });

    if (res.data.length === 0) {
      break;
    }

    issues.push(
      ...res.data
        .filter((pr) => pr.user?.type === "User")
        .map((issue) => ({
          author: issue.user?.login ?? "Unknown",
          dateCreated: new Date(issue.created_at),
        }))
    );
  }

  return issues;
}

interface ContributionScoresMember {
  githubUsername: string;
  score: number;
  mergedPrs: number;
  createdIssues: number;
}

export interface ContributionScores {
  organisation: string;
  members: Record<string, ContributionScoresMember>;
}

/**
 * @member start The start of the timespan. If not provided, the start is unbounded.
 * @member end The end of the timespan. If not provided, the end is unbounded.
 */
export interface ContributionTimeSpan {
  start?: Date;
  end?: Date;
}
