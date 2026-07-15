"use strict";

const RATING_CHECK = "application_notes_rating_check";

/**
 * Internal recruiter/interviewer notes — never exposed to candidates.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "application_notes",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          application_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "applications", key: "id" },
            onDelete: "CASCADE",
          },
          author_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
          },
          content: { type: Sequelize.TEXT, allowNull: false },
          rating: { type: Sequelize.INTEGER, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE application_notes ADD CONSTRAINT ${RATING_CHECK}
           CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);`,
        { transaction },
      );

      await queryInterface.addIndex("application_notes", ["application_id"], {
        name: "application_notes_application_id",
        transaction,
      });
      await queryInterface.addIndex("application_notes", ["author_id"], {
        name: "application_notes_author_id",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("application_notes");
  },
};
