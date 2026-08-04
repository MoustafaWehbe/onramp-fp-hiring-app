"use strict";

const FIT_SCORE_CHECK = "applications_fit_score_check";
const SCORING_STATUS_CHECK = "applications_ai_scoring_status_check";
const PIPELINE_SCORE_INDEX = "applications_job_fit_score";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "fit_score",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "ai_summary",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "ai_strengths",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "ai_gaps",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "ai_scored_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "ai_scoring_status",
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "pending",
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE applications
           ADD CONSTRAINT ${FIT_SCORE_CHECK}
           CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100);`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications
           ADD CONSTRAINT ${SCORING_STATUS_CHECK}
           CHECK (ai_scoring_status IN ('pending', 'completed', 'failed'));`,
        { transaction },
      );

      // Existing applications predate automatic scoring. Mark them retryable
      // instead of leaving them in a pending state that has no queued job.
      await queryInterface.sequelize.query(
        `UPDATE applications SET ai_scoring_status = 'failed';`,
        { transaction },
      );

      await queryInterface.addIndex(
        "applications",
        ["job_id", "fit_score"],
        {
          name: PIPELINE_SCORE_INDEX,
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("applications", PIPELINE_SCORE_INDEX, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${SCORING_STATUS_CHECK};`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${FIT_SCORE_CHECK};`,
        { transaction },
      );

      await queryInterface.removeColumn("applications", "ai_scoring_status", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "ai_scored_at", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "ai_gaps", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "ai_strengths", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "ai_summary", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "fit_score", {
        transaction,
      });
    });
  },
};
