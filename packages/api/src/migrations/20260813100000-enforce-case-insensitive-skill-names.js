"use strict";

const INDEX_NAME = "skills_name_lower_unique";

/**
 * Skill names were originally unique only with matching case. Merge any
 * pre-existing case variants, preserving all job/profile links, before adding
 * a functional unique index that also protects non-application writers.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE TEMP TABLE skill_duplicates ON COMMIT DROP AS
         SELECT id,
                FIRST_VALUE(id) OVER (
                  PARTITION BY LOWER(name)
                  ORDER BY created_at ASC, id ASC
                ) AS canonical_id
         FROM skills`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO job_skills (job_id, skill_id, created_at, updated_at)
         SELECT links.job_id, duplicates.canonical_id,
                links.created_at, links.updated_at
         FROM job_skills AS links
         INNER JOIN skill_duplicates AS duplicates
           ON duplicates.id = links.skill_id
          AND duplicates.id <> duplicates.canonical_id
         ON CONFLICT (job_id, skill_id) DO NOTHING`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO candidate_skills
           (candidate_profile_id, skill_id, created_at, updated_at)
         SELECT links.candidate_profile_id, duplicates.canonical_id,
                links.created_at, links.updated_at
         FROM candidate_skills AS links
         INNER JOIN skill_duplicates AS duplicates
           ON duplicates.id = links.skill_id
          AND duplicates.id <> duplicates.canonical_id
         ON CONFLICT (candidate_profile_id, skill_id) DO NOTHING`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DELETE FROM job_skills
         WHERE skill_id IN (
           SELECT id FROM skill_duplicates WHERE id <> canonical_id
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DELETE FROM candidate_skills
         WHERE skill_id IN (
           SELECT id FROM skill_duplicates WHERE id <> canonical_id
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DELETE FROM skills
         WHERE id IN (
           SELECT id FROM skill_duplicates WHERE id <> canonical_id
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX ${INDEX_NAME} ON skills (LOWER(name))`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("skills", INDEX_NAME);
  },
};
