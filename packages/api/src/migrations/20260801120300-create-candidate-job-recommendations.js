"use strict";

const UNIQUE_INDEX = "candidate_job_recommendations_profile_job";
const RANK_INDEX = "candidate_job_recommendations_profile_score";
const SCORE_CHECK = "candidate_job_recommendations_score_check";

/**
 * A cache, not a source of truth. Scoring a profile against every open job
 * calls an LLM per job, which is far too slow to do on a page load, so a
 * background job writes rows here and the read path serves them.
 *
 * Because it is a cache it can be stale: a job may close after being scored.
 * The serve path re-checks job status rather than trusting these rows, and
 * anything here can be deleted and recomputed without data loss.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "candidate_job_recommendations",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          candidate_profile_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "candidate_profiles", key: "id" },
            onDelete: "CASCADE",
          },
          job_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "jobs", key: "id" },
            onDelete: "CASCADE",
          },
          score: { type: Sequelize.INTEGER, allowNull: false },
          reason: { type: Sequelize.TEXT, allowNull: true },
          matched_skills: { type: Sequelize.JSONB, allowNull: true },
          computed_at: { type: Sequelize.DATE, allowNull: false },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE candidate_job_recommendations ADD CONSTRAINT ${SCORE_CHECK}
           CHECK (score BETWEEN 0 AND 100);`,
        { transaction },
      );

      // One cached score per candidate/job pair; a recompute upserts it.
      await queryInterface.addIndex(
        "candidate_job_recommendations",
        ["candidate_profile_id", "job_id"],
        { name: UNIQUE_INDEX, unique: true, transaction },
      );
      await queryInterface.addIndex(
        "candidate_job_recommendations",
        ["candidate_profile_id", "score"],
        { name: RANK_INDEX, transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_job_recommendations");
  },
};
