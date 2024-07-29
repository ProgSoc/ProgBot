import { StringOption } from "necord";

export class PollEndCommandDto {
  @StringOption({
    name: "message_id",
    description: "The message id of the poll message. Get this by right click poll > 'Copy Message ID'",
    required: true,
  })
  message_id: string;
}