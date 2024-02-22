import { GuildChannel } from "discord.js";
import { ChannelOption, StringOption } from "necord";

export class VerifyButtonCommandDto {
  @ChannelOption({
    description: "The channel to send the message to",
    required: true,
    name: "channel",
  })
  channel: GuildChannel;
  @StringOption({
    description: "The message content to send",
    required: true,
    name: "message",
  })
  message: string;
}
