"use strict";

/**
 * Candidate job bookmarks.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "saved_jobs",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          candidate_profile_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "candidate_profiles", key: "id" },
            onDelete: "CASCADE",
          },
          job_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "jobs", key: "id" },
            onDelete: "CASCADE",
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      // A candidate saves a given job only once. The unique index also
      // serves as the FK index for candidate_profile_id.
      await queryInterface.addIndex(
        "saved_jobs",
        ["candidate_profile_id", "job_id"],
        {
          name: "saved_jobs_candidate_profile_id_job_id",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex("saved_jobs", ["job_id"], {
        name: "saved_jobs_job_id",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("saved_jobs");
  },
};
