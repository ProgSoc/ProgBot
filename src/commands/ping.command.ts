import { Injectable } from "@nestjs/common";
import { Context, SlashCommand, type SlashCommandContext } from "necord";
import mainLogger from "src/logger";

@Injectable()
export class PingCommand {
  private readonly logger = mainLogger.scope(PingCommand.name);

  @SlashCommand({ name: "ping", description: "Ping the bot" })
  public async ping(@Context() [interaction]: SlashCommandContext) {
    this.logger.info("Ping command received");

    await interaction.reply({
      content: "Pong!",
      ephemeral: true,
    });
  }
}
