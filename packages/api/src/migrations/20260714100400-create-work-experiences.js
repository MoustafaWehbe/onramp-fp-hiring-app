"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "work_experiences",
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
          company: { type: Sequelize.STRING(255), allowNull: false },
          title: { type: Sequelize.STRING(255), allowNull: false },
          start_date: { type: Sequelize.DATEONLY, allowNull: false },
          // Null while this is the candidate's current role.
          end_date: { type: Sequelize.DATEONLY, allowNull: true },
          description: { type: Sequelize.TEXT, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        "work_experiences",
        ["candidate_profile_id"],
        { name: "work_experiences_candidate_profile_id", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("work_experiences");
  },
};
