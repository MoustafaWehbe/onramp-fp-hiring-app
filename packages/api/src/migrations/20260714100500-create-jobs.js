"use strict";

const STATUS_CHECK = "jobs_status_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "jobs",
        {
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
          created_by_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
          },
          title: { type: Sequelize.STRING(255), allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: false },
          location: { type: Sequelize.STRING(255), allowNull: true },
          // VARCHAR + CHECK instead of a Postgres ENUM so the constraint can
          // be altered/rolled back transactionally.
          status: {
            type: Sequelize.STRING(10),
            allowNull: false,
            defaultValue: "OPEN",
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${STATUS_CHECK}
           CHECK (status IN ('OPEN', 'CLOSED'));`,
        { transaction },
      );

      await queryInterface.addIndex("jobs", ["company_id"], {
        name: "jobs_company_id",
        transaction,
      });
      await queryInterface.addIndex("jobs", ["created_by_id"], {
        name: "jobs_created_by_id",
        transaction,
      });
      // The job board filters on status constantly.
      await queryInterface.addIndex("jobs", ["status"], {
        name: "jobs_status",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("jobs");
  },
};
