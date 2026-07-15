"use strict";

/**
 * Junction: candidate_profiles <-> skills. Composite PK, no surrogate id.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "candidate_skills",
        {
          candidate_profile_id: {
            type: Sequelize.UUID,
            primaryKey: true,
            references: { model: "candidate_profiles", key: "id" },
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

      // The composite PK already indexes candidate_profile_id (leading
      // column); skill_id needs its own index for reverse lookups.
      await queryInterface.addIndex("candidate_skills", ["skill_id"], {
        name: "candidate_skills_skill_id",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_skills");
  },
};
