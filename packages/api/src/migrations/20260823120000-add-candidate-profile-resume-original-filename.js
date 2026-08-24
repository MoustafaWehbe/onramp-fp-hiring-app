"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "candidate_profiles",
      "resume_original_filename",
      {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "candidate_profiles",
      "resume_original_filename",
    );
  },
};
