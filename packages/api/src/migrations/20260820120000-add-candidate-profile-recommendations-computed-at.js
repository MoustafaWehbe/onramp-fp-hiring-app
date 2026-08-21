"use strict";

/**
 * A durable marker of "a recommendations scoring pass has completed for this
 * profile" — set whenever computeCandidateRecommendations finishes, whether
 * or not any rows resulted.
 *
 * candidate_job_recommendations row *presence* can't answer this: a
 * candidate who has applied to every open job scores zero eligible jobs on
 * purpose, so the cache table is legitimately empty for them. Without this
 * column the read path has no way to tell "never scored" (show a spinner)
 * apart from "scored, nothing left" (show an empty state), and reports the
 * former forever.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "candidate_profiles",
        "recommendations_computed_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      // Profiles that already have cached recommendation rows have
      // demonstrably been scored before this column existed — backfill from
      // their own rows so they don't regress to a false "still computing"
      // state on first read after this migration. Profiles with no rows stay
      // NULL either way: a genuine first-visit and "scored, nothing eligible"
      // look identical in history, and both correctly resolve themselves via
      // the normal first-visit recompute the read path already triggers.
      await queryInterface.sequelize.query(
        `UPDATE candidate_profiles cp
            SET recommendations_computed_at = latest.computed_at
           FROM (
             SELECT candidate_profile_id, MAX(computed_at) AS computed_at
               FROM candidate_job_recommendations
              GROUP BY candidate_profile_id
           ) AS latest
          WHERE latest.candidate_profile_id = cp.id;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "candidate_profiles",
      "recommendations_computed_at",
    );
  },
};
