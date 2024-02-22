import { BooleanOption, StringOption } from "necord";

export class DocsSearchCommandDto {
  @StringOption({
    name: "query",
    description: "The query to search for",
    required: true,
  })
  query: string;
  @BooleanOption({
    name: "publish",
    description: "Publish the message",
    required: false,
  })
  publish?: boolean;
}
