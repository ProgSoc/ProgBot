import { StringOption } from "necord";

export class HandbookSubjectCommandDto {
  @StringOption({
    name: "code",
    description: "The subject code",
    autocomplete: true,
    required: true,
  })
  code: string;
}
