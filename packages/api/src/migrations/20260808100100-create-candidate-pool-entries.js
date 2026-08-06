"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("candidate_pool_entries", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "companies", key: "id" },
        onDelete: "CASCADE",
      },
      candidate_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "candidate_profiles", key: "id" },
        // A deleted candidate profile disappears from the pool cleanly rather
        // than leaving a row that the recruiter view cannot render.
        onDelete: "CASCADE",
      },
      added_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      added_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex(
      "candidate_pool_entries",
      ["company_id", "candidate_id"],
      {
        unique: true,
        name: "candidate_pool_entries_company_id_candidate_id_key",
      },
    );
    await queryInterface.addIndex("candidate_pool_entries", ["candidate_id"], {
      name: "candidate_pool_entries_candidate_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_pool_entries");
  },
};
