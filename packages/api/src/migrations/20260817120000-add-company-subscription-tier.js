"use strict";

const SUBSCRIPTION_TIER_CHECK = "companies_subscription_tier_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "companies",
        "subscription_tier",
        {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "FREE",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "companies",
        "subscription_started_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "companies",
        "subscription_updated_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE companies
           ADD CONSTRAINT ${SUBSCRIPTION_TIER_CHECK}
           CHECK (subscription_tier IN ('FREE', 'PRO'));`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE companies DROP CONSTRAINT IF EXISTS ${SUBSCRIPTION_TIER_CHECK};`,
        { transaction },
      );

      await queryInterface.removeColumn("companies", "subscription_updated_at", {
        transaction,
      });
      await queryInterface.removeColumn("companies", "subscription_started_at", {
        transaction,
      });
      await queryInterface.removeColumn("companies", "subscription_tier", {
        transaction,
      });
    });
  },
};
