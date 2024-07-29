import { BooleanOption, StringOption } from "necord";

export class PollCreateCommandDto {
  @StringOption({
    name: "question",
    description: "The poll question, max 300 characters",
    required: true,
  })
  question: string;
  @StringOption({
    name: "options",
    description: "The poll options (max 10) separated by a comma, max 50 characters per option",
    required: true,
  })
  options: string;
  @StringOption({
    name: "duration",
    description: "The poll duration (min 1h, max 32d or 4w). Accepts a whole number followed by a unit: h, d, w",
    required: true,
  })
  duration: string;
  @BooleanOption({
    name: "allow_multiselect",
    description: "Allow multiple options to be selected",
    required: true,
  })
  allow_multiselect: boolean;
  @StringOption({ 
    name: "poll_message",
    description: "The poll message, max 2000 characters",
    required: false,
  })
  poll_message: string;
}