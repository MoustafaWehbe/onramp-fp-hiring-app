"use strict";

const TYPE_CHECK = "notifications_type_check";
const UNREAD_INDEX = "notifications_user_id_created_at";

/**
 * In-app notifications. One row per recipient — a new application fans out to
 * one row per recruiter at the owning company rather than a single shared row,
 * so read state is per-user without a join table.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "notifications",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
          },
          type: { type: Sequelize.STRING(40), allowNull: false },
          title: { type: Sequelize.STRING(255), allowNull: false },
          body: { type: Sequelize.TEXT, allowNull: true },
          // SET NULL rather than CASCADE: a notification stays in the user's
          // history after its application goes away, and click-through then
          // fails gracefully instead of the row silently disappearing.
          related_application_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "applications", key: "id" },
            onDelete: "SET NULL",
          },
          read_at: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE notifications ADD CONSTRAINT ${TYPE_CHECK}
           CHECK (type IN ('new_application', 'stage_change'));`,
        { transaction },
      );

      // The list endpoint always reads one user's newest-first page, and the
      // id tiebreak keeps that ordering total when timestamps collide.
      await queryInterface.addIndex(
        "notifications",
        ["user_id", "created_at", "id"],
        { name: UNREAD_INDEX, transaction },
      );
      await queryInterface.addIndex(
        "notifications",
        ["related_application_id"],
        { name: "notifications_related_application_id", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};
