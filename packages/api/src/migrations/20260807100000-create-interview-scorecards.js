"use strict";

const RATING_RANGE_CHECK = "scorecard_ratings_rating_range_check";

/**
 * Structured interview scorecards.
 *
 * Four tables in one migration because they are meaningless apart: a template
 * owns criteria, a submitted scorecard points at a template, and a rating
 * points at both a scorecard and one of that template's criteria. Creating
 * them separately would leave intermediate states where the foreign keys have
 * nothing to reference.
 *
 * Delete behaviour is deliberate rather than uniform:
 *  - criteria CASCADE from their template: a criterion has no meaning without
 *    one.
 *  - ratings RESTRICT from criteria. This is the database half of "you cannot
 *    delete a criterion that already has ratings against it" — the service
 *    checks first and returns a readable 409, but the constraint means even a
 *    direct SQL delete cannot quietly orphan historical scores.
 *  - scorecards RESTRICT from templates, for the same reason one level up.
 *  - interviewer_id and created_by take no onDelete, matching
 *    jobs.created_by_id. A submitted evaluation is a record of a judgement
 *    someone made; removing the account should not silently erase it.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "scorecard_templates",
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
          title: { type: Sequelize.STRING(255), allowNull: false },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex("scorecard_templates", ["company_id"], {
        name: "scorecard_templates_company_id",
        transaction,
      });

      await queryInterface.createTable(
        "scorecard_criteria",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          template_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "scorecard_templates", key: "id" },
            onDelete: "CASCADE",
          },
          label: { type: Sequelize.STRING(255), allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex("scorecard_criteria", ["template_id"], {
        name: "scorecard_criteria_template_id",
        transaction,
      });

      await queryInterface.createTable(
        "interview_scorecards",
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
          template_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "scorecard_templates", key: "id" },
          },
          interviewer_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
          },
          overall_comment: { type: Sequelize.TEXT, allowNull: true },
          submitted_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      // One scorecard per interviewer per application. This is what makes a
      // resubmission an update rather than a second opinion from the same
      // person — without it, a double submit would count twice in the average.
      await queryInterface.addIndex(
        "interview_scorecards",
        ["application_id", "interviewer_id"],
        {
          unique: true,
          name: "interview_scorecards_application_id_interviewer_id_key",
          transaction,
        },
      );

      await queryInterface.createTable(
        "scorecard_ratings",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          scorecard_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "interview_scorecards", key: "id" },
            onDelete: "CASCADE",
          },
          criterion_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "scorecard_criteria", key: "id" },
            onDelete: "RESTRICT",
          },
          rating: { type: Sequelize.INTEGER, allowNull: false },
          comment: { type: Sequelize.TEXT, allowNull: true },
        },
        { transaction },
      );

      // The 1-5 scale is fixed for this phase, so it belongs in the schema:
      // an average is only meaningful if every value feeding it is in range.
      await queryInterface.sequelize.query(
        `ALTER TABLE scorecard_ratings ADD CONSTRAINT ${RATING_RANGE_CHECK}
           CHECK (rating BETWEEN 1 AND 5);`,
        { transaction },
      );

      // One rating per criterion per scorecard. Two rows for the same
      // criterion would silently weight that criterion twice in the average.
      await queryInterface.addIndex(
        "scorecard_ratings",
        ["scorecard_id", "criterion_id"],
        {
          unique: true,
          name: "scorecard_ratings_scorecard_id_criterion_id_key",
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("scorecard_ratings", { transaction });
      await queryInterface.dropTable("interview_scorecards", { transaction });
      await queryInterface.dropTable("scorecard_criteria", { transaction });
      await queryInterface.dropTable("scorecard_templates", { transaction });
    });
  },
};
