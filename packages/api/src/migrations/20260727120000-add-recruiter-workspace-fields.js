"use strict";

const JOB_STATUS_CHECK = "jobs_status_check";
const EMPLOYMENT_TYPE_CHECK = "jobs_employment_type_check";
const EXPERIENCE_RANGE_CHECK = "jobs_experience_range_check";
const SALARY_RANGE_CHECK = "jobs_salary_range_check";
const SALARY_CURRENCY_CHECK = "jobs_salary_currency_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "companies",
        "industry",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "companies",
        "size",
        { type: Sequelize.STRING(100), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "companies",
        "location",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "companies",
        "contact",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );

      await queryInterface.addColumn(
        "jobs",
        "employment_type",
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "FULL_TIME",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "experience_min",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "experience_max",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "is_remote",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "salary_min",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "salary_max",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "jobs",
        "salary_currency",
        {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: "USD",
        },
        { transaction },
      );

      await queryInterface.removeConstraint("jobs", JOB_STATUS_CHECK, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${JOB_STATUS_CHECK}
           CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED'));`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'DRAFT';",
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${EMPLOYMENT_TYPE_CHECK}
           CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT'));`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${EXPERIENCE_RANGE_CHECK}
           CHECK (
             experience_min >= 0
             AND experience_max >= experience_min
           );`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${SALARY_RANGE_CHECK}
           CHECK (
             salary_min >= 0
             AND salary_max >= salary_min
           );`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${SALARY_CURRENCY_CHECK}
           CHECK (salary_currency ~ '^[A-Z]{3}$');`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint("jobs", EMPLOYMENT_TYPE_CHECK, {
        transaction,
      });
      await queryInterface.removeConstraint("jobs", EXPERIENCE_RANGE_CHECK, {
        transaction,
      });
      await queryInterface.removeConstraint("jobs", SALARY_RANGE_CHECK, {
        transaction,
      });
      await queryInterface.removeConstraint("jobs", SALARY_CURRENCY_CHECK, {
        transaction,
      });

      await queryInterface.sequelize.query(
        "UPDATE jobs SET status = 'CLOSED' WHERE status = 'DRAFT';",
        { transaction },
      );
      await queryInterface.removeConstraint("jobs", JOB_STATUS_CHECK, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE jobs ADD CONSTRAINT ${JOB_STATUS_CHECK}
           CHECK (status IN ('OPEN', 'CLOSED'));`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'OPEN';",
        { transaction },
      );

      for (const column of [
        "salary_currency",
        "salary_max",
        "salary_min",
        "is_remote",
        "experience_max",
        "experience_min",
        "employment_type",
      ]) {
        await queryInterface.removeColumn("jobs", column, { transaction });
      }

      for (const column of ["contact", "location", "size", "industry"]) {
        await queryInterface.removeColumn("companies", column, { transaction });
      }
    });
  },
};
