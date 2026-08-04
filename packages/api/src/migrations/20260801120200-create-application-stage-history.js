"use strict";

const APPLICATION_INDEX = "application_stage_history_application_changed_at";
const TO_STAGE_INDEX = "application_stage_history_to_stage";
const STAGE_CHECK = "application_stage_history_stage_check";

const STAGES = [
  "DRAFT",
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
];

/**
 * An append-only record of every stage an application has moved through.
 *
 * Two features need it: the candidate timeline, and phase 5's funnel, which
 * could not say which stage a rejected candidate exited from because only the
 * current stage was stored.
 *
 * The backfill deliberately writes only the one entry that is a known fact —
 * the application was submitted at submitted_at — and invents nothing else.
 * Rows that moved stages before this table existed left no evidence of when
 * or from where, so the timeline reports history as starting here rather than
 * showing fabricated transitions.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "application_stage_history",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          application_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "applications", key: "id" },
            onDelete: "CASCADE",
          },
          // Null for the entry that records the application being submitted:
          // there is no stage before it.
          from_stage: { type: Sequelize.STRING(20), allowNull: true },
          to_stage: { type: Sequelize.STRING(20), allowNull: false },
          changed_at: { type: Sequelize.DATE, allowNull: false },
          // Null when nobody did it by hand — a candidate submitting, or a
          // backfilled row. Set to the recruiter who moved the card.
          changed_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      const stageList = STAGES.map((stage) => `'${stage}'`).join(", ");
      await queryInterface.sequelize.query(
        `ALTER TABLE application_stage_history ADD CONSTRAINT ${STAGE_CHECK}
           CHECK (
             to_stage IN (${stageList})
             AND (from_stage IS NULL OR from_stage IN (${stageList}))
           );`,
        { transaction },
      );

      await queryInterface.addIndex(
        "application_stage_history",
        ["application_id", "changed_at"],
        { name: APPLICATION_INDEX, transaction },
      );
      await queryInterface.addIndex("application_stage_history", ["to_stage"], {
        name: TO_STAGE_INDEX,
        transaction,
      });

      // The submission itself is the one historical transition with evidence:
      // submitted_at is when the candidate applied.
      await queryInterface.sequelize.query(
        `INSERT INTO application_stage_history
           (id, application_id, from_stage, to_stage, changed_at, changed_by,
            created_at, updated_at)
         SELECT gen_random_uuid(), id, NULL, 'APPLIED',
                COALESCE(submitted_at, created_at), NULL, NOW(), NOW()
           FROM applications
          WHERE stage <> 'DRAFT';`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("application_stage_history");
  },
};
