import { ExceptionFilter, Catch, ArgumentsHost } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { BaseInteraction } from "discord.js";
import { NecordArgumentsHost } from "necord";
import mainLogger from "src/logger";

@Catch()
export class DiscordExceptionFilter implements ExceptionFilter {
  public async catch(exception: Error, host: ArgumentsHost) {
    const necordContext = NecordArgumentsHost.create(host).getContext();
    if (!Array.isArray(necordContext)) {
      return mainLogger.warn(exception);
    }

    const [interaction] = necordContext;

    if (!interaction) {
      return mainLogger.warn(exception);
    }

    Sentry.captureException(exception);

    if (
      interaction &&
      interaction instanceof BaseInteraction &&
      interaction.isRepliable()
    ) {
      return await interaction.reply({
        content: exception.message,
        ephemeral: true,
      });
    }

    return mainLogger.error(exception);
  }
}
