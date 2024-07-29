import { BooleanOption, StringOption } from "necord";

export class PollExportCommandDto {
  @StringOption({
    name: "message_id",
    description: "The message id of the poll message. Get this by right click poll > 'Copy Message ID'",
    required: true,
  })
  message_id: string;
  @BooleanOption({
    name: "reply_privately",
    description: "Whether the bot should reply privately. Defaults to true.",
    required: true,
  })
  reply_privately: boolean;
}