import { Injectable } from "@nestjs/common";
import mainLogger from "./logger";
import { Context, type ContextOf, On, Once } from "necord";
import {
  ActivityType,
  ApplicationRoleConnectionMetadataType,
  OAuth2Scopes,
} from "discord.js";
import terminalLink from "terminal-link";

@Injectable()
export class DiscordService {
  private readonly logger = mainLogger.scope("DiscordService");

  @Once("ready")
  public async onReady(@Context() [client]: ContextOf<"ready">) {
    this.logger.info(`Logged in as ${client.user.tag}`);
    this.logger.debug(
      terminalLink(
        "Invite link",
        client.generateInvite({
          scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        }),
      ),
    );
    client.user.setPresence({
      activities: [
        {
          name: "Hello World!",
          state: "Hello World!",
          type: ActivityType.Custom,
        },
      ],
      afk: false,
      status: "online",
    });

    this.logger.time("editRoleConnectionMetadataRecords");
    await client.application.editRoleConnectionMetadataRecords([
      {
        key: "member",
        description: "Are you on the member list?",
        name: "Member",
        type: ApplicationRoleConnectionMetadataType.BooleanEqual,
      },
      {
        key: "joined",
        description: "The number of days since you joined the society.",
        name: "Joined",
        type: ApplicationRoleConnectionMetadataType.DatetimeGreaterThanOrEqual,
      },
      {
        key: "expiry",
        description: "The number of days until your membership expires.",
        name: "Expiry",
        type: ApplicationRoleConnectionMetadataType.DatetimeLessThanOrEqual,
      },
    ]);
    this.logger.timeEnd("editRoleConnectionMetadataRecords");
  }

  @On("warn")
  public onWarn(@Context() [info]: ContextOf<"warn">) {
    this.logger.warn(info);
  }
}
