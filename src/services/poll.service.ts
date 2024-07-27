import {
  AllowedMentionsTypes,
  RESTAPIPollCreate,
  RESTGetAPIChannelMessageResult,
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
    channelId: string,
    poll: RESTAPIPollCreate,
    content: string | undefined,
    allowMentionEveryone: boolean,
  ): Promise<RESTPostAPIChannelMessageResult> {
    const url = `${DISCORD_BASE_URL}/channels/${channelId}/messages`;

    const reqBody: RESTPostAPIChannelMessageJSONBody = {
      content,
      allowed_mentions: {
        parse: [AllowedMentionsTypes.User, AllowedMentionsTypes.Role],
      },
      poll,
    };
    if (allowMentionEveryone) {
      reqBody.allowed_mentions!.parse!.push(AllowedMentionsTypes.Everyone);
    }

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

  public async pollGet(
    channelId: string,
    messageId: string
  ): Promise<RESTGetAPIChannelMessageResult> {
    const url = `${DISCORD_BASE_URL}/channels/${channelId}/messages/${messageId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${this.configService.getOrThrow("DISCORD_TOKEN")}`,
      },
    });

    if (!res.ok) {
      throw new Error(`pollGet !res.ok`);
    }

    return await res.json();
  }
}
