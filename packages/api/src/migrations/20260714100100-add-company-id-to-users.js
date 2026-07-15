"use strict";

/**
 * Internal users (ADMIN/RECRUITER/INTERVIEWER) belong to a company;
 * candidates leave company_id null.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "users",
        "company_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "companies", key: "id" },
          onDelete: "SET NULL",
        },
        { transaction },
      );

      await queryInterface.addIndex("users", ["company_id"], {
        name: "users_company_id",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("users", "users_company_id", {
        transaction,
      });
      await queryInterface.removeColumn("users", "company_id", { transaction });
    });
  },
};
