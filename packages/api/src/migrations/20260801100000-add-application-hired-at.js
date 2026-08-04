"use strict";

const HIRED_AT_INDEX = "applications_hired_at";

/**
 * Time-to-hire needs a timestamp of the hire itself.
 *
 * updated_at cannot stand in for it: since phase 3 a recruiter can edit notes
 * on a hired candidate at any time, which would silently stretch the metric.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "applications",
        "hired_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      // Rows hired before this column existed have no exact timestamp.
      // updated_at is the closest available approximation and is better than
      // dropping historical hires out of the metric entirely.
      await queryInterface.sequelize.query(
        `UPDATE applications
            SET hired_at = updated_at
          WHERE stage = 'HIRED' AND hired_at IS NULL;`,
        { transaction },
      );

      await queryInterface.addIndex("applications", ["hired_at"], {
        name: HIRED_AT_INDEX,
        where: { hired_at: { [Sequelize.Op.ne]: null } },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("applications", HIRED_AT_INDEX, {
        transaction,
      });
      await queryInterface.removeColumn("applications", "hired_at", {
        transaction,
      });
    });
  },
};
