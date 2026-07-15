"use strict";

/**
 * Assigning an INTERVIEWER to an application is what grants them read
 * access to it.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "interview_assignments",
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
          interviewer_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      // An interviewer is assigned to a given application only once. The
      // unique index also serves as the FK index for application_id.
      await queryInterface.addIndex(
        "interview_assignments",
        ["application_id", "interviewer_id"],
        {
          name: "interview_assignments_application_id_interviewer_id",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "interview_assignments",
        ["interviewer_id"],
        { name: "interview_assignments_interviewer_id", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("interview_assignments");
  },
};
