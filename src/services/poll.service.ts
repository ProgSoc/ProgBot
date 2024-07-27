import {
  RESTAPIPollCreate,
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult
} from "discord.js";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DATABASE_TOKEN, type Database } from "src/db/db.module";
import mainLogger from "src/logger";

const DISCORD_BASE_URL = "https://discord.com/api/v10";

@Injectable()
export class PollService {
  private readonly logger = mainLogger.scope(PollService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
  };

  public async pollCreate(
    channel_id: string,
    poll: RESTAPIPollCreate,
  ): Promise<RESTPostAPIChannelMessageResult> {
    const url = `${DISCORD_BASE_URL}/channels/${channel_id}/messages`;

    const reqBody: RESTPostAPIChannelMessageJSONBody = {
      poll,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${this.configService.getOrThrow("DISCORD_TOKEN")}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      throw new Error(`pollCreate !res.ok`);
    }

    return await res.json();
  }
}
