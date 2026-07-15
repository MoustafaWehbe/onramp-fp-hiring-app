"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("candidate_profiles", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        // The UNIQUE constraint also serves as the FK index.
        unique: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      headline: { type: Sequelize.STRING(255), allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      resume_url: { type: Sequelize.STRING(2048), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_profiles");
  },
};
