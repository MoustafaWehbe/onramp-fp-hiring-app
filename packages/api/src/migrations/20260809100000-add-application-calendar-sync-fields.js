"use strict";

const SYNC_STATUS_CHECK = "applications_calendar_sync_status_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "google_event_id",
        { type: Sequelize.STRING(1024), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "google_meet_link",
        { type: Sequelize.STRING(2048), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "calendar_sync_status",
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "calendar_sync_recruiter_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE applications ADD CONSTRAINT ${SYNC_STATUS_CHECK}
         CHECK (calendar_sync_status IS NULL OR calendar_sync_status IN ('not_synced', 'synced', 'failed'));`,
        { transaction },
      );
      await queryInterface.addIndex("applications", ["interview_date"], {
        name: "applications_interview_date_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "applications",
        ["calendar_sync_recruiter_id"],
        { name: "applications_calendar_sync_recruiter_id_idx", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "applications",
        "applications_calendar_sync_recruiter_id_idx",
        { transaction },
      );
      await queryInterface.removeIndex(
        "applications",
        "applications_interview_date_idx",
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${SYNC_STATUS_CHECK};`,
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "calendar_sync_recruiter_id",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "calendar_sync_status",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "google_meet_link",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "google_event_id",
        { transaction },
      );
    });
  },
};
