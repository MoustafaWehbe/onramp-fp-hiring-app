"use strict";

const PROFILE_INDEX = "candidate_education_candidate_profile_id";
const DATE_ORDER_CHECK = "candidate_education_date_order_check";

/**
 * Education entries, hanging off candidate_profiles the same way
 * work_experiences does — the FK is candidate_profile_id, not a bare user id,
 * matching every other candidate sub-resource.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "candidate_education",
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
          institution: { type: Sequelize.STRING(255), allowNull: false },
          degree: { type: Sequelize.STRING(255), allowNull: true },
          field_of_study: { type: Sequelize.STRING(255), allowNull: true },
          start_date: { type: Sequelize.DATEONLY, allowNull: false },
          // Null while the candidate is still studying.
          end_date: { type: Sequelize.DATEONLY, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE candidate_education ADD CONSTRAINT ${DATE_ORDER_CHECK}
           CHECK (end_date IS NULL OR end_date >= start_date);`,
        { transaction },
      );

      await queryInterface.addIndex(
        "candidate_education",
        ["candidate_profile_id"],
        { name: PROFILE_INDEX, transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_education");
  },
};
