"use strict";

const { hashPassword } = require("bcryptjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await require("bcryptjs").hash("Admin1234!", 12);
    await queryInterface.bulkInsert("users", [
      {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@example.com",
        password_hash: passwordHash,
        name: "Admin User",
        role: "ADMIN",
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { email: "admin@example.com" });
  },
};
