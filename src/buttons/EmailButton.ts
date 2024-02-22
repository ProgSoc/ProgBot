import { Inject, Injectable } from "@nestjs/common";
import { ButtonBuilder, ButtonStyle } from "discord.js";
import { Button, type ButtonContext, Context } from "necord";
import { DATABASE_TOKEN, type Database } from "src/db/db.module";
import { LinkMembershipEmailModal } from "src/modals/EmailLink.modal";
import { LinkMemberShipModal } from "src/modals/LinkMembership.modal";
import { MembershipsService } from "src/services/memberships.service";
import { TimetableService } from "src/services/timetable.service";

@Injectable()
export class VerifyEmailButton {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly membershipsService: MembershipsService,
  ) {}

  /**
   * Verify a membership using modal
   * @param param[0] The button context
   */
  @Button("verify-email")
  public async verifyMembership(@Context() [interaction]: ButtonContext) {
    return interaction.showModal(LinkMembershipEmailModal.getModal());
  }

  public static getButton() {
    return new ButtonBuilder()
      .setCustomId("verify-email")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✅");
  }
}
