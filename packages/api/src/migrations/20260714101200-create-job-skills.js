"use strict";

/**
 * Junction: jobs <-> skills (the job's tech stack). Composite PK, no
 * surrogate id.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "job_skills",
        {
          job_id: {
            type: Sequelize.UUID,
            primaryKey: true,
            references: { model: "jobs", key: "id" },
            onDelete: "CASCADE",
          },
          skill_id: {
            type: Sequelize.UUID,
            primaryKey: true,
            references: { model: "skills", key: "id" },
            onDelete: "CASCADE",
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      // The composite PK already indexes job_id (leading column); skill_id
      // needs its own index for reverse lookups.
      await queryInterface.addIndex("job_skills", ["skill_id"], {
        name: "job_skills_skill_id",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("job_skills");
  },
};
