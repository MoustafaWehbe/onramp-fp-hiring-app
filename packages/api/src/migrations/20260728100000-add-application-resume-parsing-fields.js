"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "resume_file_url",
        {
          type: Sequelize.STRING(2048),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "resume_original_filename",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "resume_text",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "parsed_years_experience",
        {
          type: Sequelize.DECIMAL(4, 1),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "parsed_skills",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "applications",
        "resume_uploaded_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        "applications",
        "resume_uploaded_at",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "parsed_skills",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "parsed_years_experience",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_text",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_original_filename",
        { transaction },
      );
      await queryInterface.removeColumn(
        "applications",
        "resume_file_url",
        { transaction },
      );
    });
  },
};
