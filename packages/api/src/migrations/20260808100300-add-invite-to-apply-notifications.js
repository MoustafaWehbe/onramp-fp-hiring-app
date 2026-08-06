"use strict";

const TYPE_CHECK = "notifications_type_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "notifications",
        "related_job_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "jobs", key: "id" },
          onDelete: "SET NULL",
        },
        { transaction },
      );
      await queryInterface.addIndex("notifications", ["related_job_id"], {
        name: "notifications_related_job_id",
        transaction,
      });
      await queryInterface.removeConstraint("notifications", TYPE_CHECK, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE notifications ADD CONSTRAINT ${TYPE_CHECK}
           CHECK (type IN ('new_application', 'stage_change', 'invite_to_apply'));`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "DELETE FROM notifications WHERE type = 'invite_to_apply';",
        { transaction },
      );
      await queryInterface.removeConstraint("notifications", TYPE_CHECK, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE notifications ADD CONSTRAINT ${TYPE_CHECK}
           CHECK (type IN ('new_application', 'stage_change'));`,
        { transaction },
      );
      await queryInterface.removeColumn("notifications", "related_job_id", {
        transaction,
      });
    });
  },
};
