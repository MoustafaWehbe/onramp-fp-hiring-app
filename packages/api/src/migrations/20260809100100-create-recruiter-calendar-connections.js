"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("recruiter_calendar_connections", {
      recruiter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // AES-256-GCM ciphertext envelope. The column name follows the product
      // model while the application layer guarantees plaintext never lands.
      google_refresh_token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      google_email: {
        type: Sequelize.STRING(320),
        allowNull: false,
      },
      connected_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("recruiter_calendar_connections");
  },
};
