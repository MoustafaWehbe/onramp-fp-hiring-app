"use strict";

/**
 * Backs the candidate-only "Applicant Percentile Score" feature: a
 * deterministic (temperature 0) resume-review score computed once at
 * application time, plus the percentile rank derived from it and locked in
 * alongside it. Both are candidate-private — application-percentile.service.ts
 * is the only writer, and applications.service.ts's serialize() strips these
 * columns from every response shape, including the recruiter-facing one.
 *
 * Distinct from fit_score/ai_summary/ai_strengths/ai_gaps, which come from a
 * different AI module (fit-score.ts) on a different, recruiter-facing path.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "resume_review_score",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "resume_review_percentile",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "resume_review_scored_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE applications ADD CONSTRAINT applications_resume_review_score_check
         CHECK (resume_review_score IS NULL OR (resume_review_score >= 0 AND resume_review_score <= 100));`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications ADD CONSTRAINT applications_resume_review_percentile_check
         CHECK (resume_review_percentile IS NULL OR (resume_review_percentile >= 0 AND resume_review_percentile <= 100));`,
        { transaction },
      );

      // Percentile computation reads every scored, non-draft application for
      // a job; this is exactly that lookup's shape.
      await queryInterface.addIndex(
        "applications",
        ["job_id", "resume_review_score"],
        {
          name: "applications_job_resume_review_score_idx",
          where: { resume_review_score: { [Sequelize.Op.ne]: null } },
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "applications",
        "applications_job_resume_review_score_idx",
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_review_percentile_check;`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_review_score_check;`,
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_review_scored_at",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_review_percentile",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_review_score",
        { transaction },
      );
    });
  },
};
