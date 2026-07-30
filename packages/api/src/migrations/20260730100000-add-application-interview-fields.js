"use strict";

const SCHEDULED_AT_CHECK = "applications_interview_scheduled_at_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "interview_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "recruiter_notes",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "interview_scheduled_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      // interview_scheduled_at records when a date was *first* set, so it can
      // never exist on a row that has never had one. Clearing the date keeps
      // the audit stamp, which is why this is one-directional.
      await queryInterface.sequelize.query(
        `ALTER TABLE applications
           ADD CONSTRAINT ${SCHEDULED_AT_CHECK}
           CHECK (interview_scheduled_at IS NOT NULL OR interview_date IS NULL);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${SCHEDULED_AT_CHECK};`,
        { transaction },
      );
      await queryInterface.removeColumn("applications", "interview_scheduled_at", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "recruiter_notes", {
        transaction,
      });
      await queryInterface.removeColumn("applications", "interview_date", {
        transaction,
      });
    });
  },
};
