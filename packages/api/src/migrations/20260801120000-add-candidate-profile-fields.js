"use strict";

/**
 * Extends the existing candidate_profiles table rather than creating one.
 *
 * The table has existed since the original domain model and is referenced by
 * applications, saved_jobs, candidate_skills, and work_experiences, so its
 * headline/bio columns already carry data and already back the profile UI.
 * `bio` serves as the profile summary; only links, photo, and the seed marker
 * are new.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "candidate_profiles",
        "links",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "candidate_profiles",
        "profile_photo_url",
        {
          type: Sequelize.STRING(2048),
          allowNull: true,
        },
        { transaction },
      );
      // Records that the one-time seed from parsed resume data has run.
      // Seeding is gated on this being null, which is what stops a later
      // re-parse from overwriting anything the candidate has since edited.
      await queryInterface.addColumn(
        "candidate_profiles",
        "profile_seeded_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      // Profiles that predate this phase were authored by hand, so they are
      // marked as already seeded — their content must never be replaced by a
      // parse of a resume uploaded later.
      await queryInterface.sequelize.query(
        `UPDATE candidate_profiles
            SET profile_seeded_at = updated_at
          WHERE headline IS NOT NULL OR bio IS NOT NULL;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        "candidate_profiles",
        "profile_seeded_at",
        { transaction },
      );
      await queryInterface.removeColumn(
        "candidate_profiles",
        "profile_photo_url",
        { transaction },
      );
      await queryInterface.removeColumn("candidate_profiles", "links", {
        transaction,
      });
    });
  },
};
