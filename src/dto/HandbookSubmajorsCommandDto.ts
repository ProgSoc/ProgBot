import { StringOption } from "necord";

export class HandbookSubmajorsCommandDto {
  @StringOption({
    name: "search",
    description: "The search query",
    required: true,
  })
  search: string;
}
