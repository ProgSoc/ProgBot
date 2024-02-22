import { StringOption } from "necord";

export class HandbookMajorsCommandDto {
  @StringOption({
    name: "search",
    description: "The search query",
    required: true,
  })
  search: string;
}
