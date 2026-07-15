"use strict";

const STAGE_CHECK = "applications_stage_check";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "applications",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          job_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "jobs", key: "id" },
            onDelete: "CASCADE",
          },
          candidate_profile_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "candidate_profiles", key: "id" },
            onDelete: "CASCADE",
          },
          // DRAFT = candidate-only "save your progress" state; must never
          // surface in a recruiter pipeline. VARCHAR + CHECK, not ENUM.
          stage: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "DRAFT",
          },
          cover_letter: { type: Sequelize.TEXT, allowNull: true },
          // Snapshot of the candidate's resume URL at the time of applying.
          resume_url: { type: Sequelize.STRING(2048), allowNull: true },
          // Null while the application is a DRAFT.
          submitted_at: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE applications ADD CONSTRAINT ${STAGE_CHECK}
           CHECK (stage IN ('DRAFT', 'APPLIED', 'REVIEWED', 'INTERVIEWING',
                            'OFFER', 'HIRED', 'REJECTED'));`,
        { transaction },
      );

      // A candidate applies to a given job only once. The unique index also
      // serves as the FK index for job_id (leading column).
      await queryInterface.addIndex(
        "applications",
        ["job_id", "candidate_profile_id"],
        {
          name: "applications_job_id_candidate_profile_id",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex("applications", ["candidate_profile_id"], {
        name: "applications_candidate_profile_id",
        transaction,
      });
      // The pipeline Kanban groups by stage constantly.
      await queryInterface.addIndex("applications", ["stage"], {
        name: "applications_stage",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("applications");
  },
};
