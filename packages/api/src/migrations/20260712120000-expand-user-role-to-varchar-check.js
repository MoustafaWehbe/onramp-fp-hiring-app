"use strict";

const ROLE_CHECK = "users_role_check";

/**
 * Replace users.role enum_users_role ('admin' | 'user') with
 * VARCHAR(20) + CHECK ('ADMIN' | 'RECRUITER' | 'INTERVIEWER' | 'CANDIDATE').
 *
 * A VARCHAR + CHECK is used instead of altering the enum: Postgres enums
 * cannot gain values inside a transaction and cannot be cleanly rolled back.
 * Converting away from the enum is fully transactional, so both `up` and
 * `down` run atomically.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // The old default is typed 'user'::enum_users_role and must go first.
      await queryInterface.sequelize.query(
        "ALTER TABLE users ALTER COLUMN role DROP DEFAULT;",
        { transaction },
      );

      // Convert the column type and migrate existing rows in one atomic
      // statement: 'admin' -> 'ADMIN', 'user' -> 'CANDIDATE'. Any unexpected
      // value passes through unchanged so the CHECK constraint below fails
      // the whole transaction rather than silently mangling a row.
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)
           USING (
             CASE role::text
               WHEN 'admin' THEN 'ADMIN'
               WHEN 'user' THEN 'CANDIDATE'
               ELSE role::text
             END
           );`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CANDIDATE';",
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE users ADD CONSTRAINT ${ROLE_CHECK}
           CHECK (role IN ('ADMIN', 'RECRUITER', 'INTERVIEWER', 'CANDIDATE'));`,
        { transaction },
      );

      // No column references the enum any more. Plain DROP (no CASCADE): if
      // anything else still depends on it, fail and roll everything back.
      await queryInterface.sequelize.query("DROP TYPE enum_users_role;", {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE users DROP CONSTRAINT IF EXISTS ${ROLE_CHECK};`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        "ALTER TABLE users ALTER COLUMN role DROP DEFAULT;",
        { transaction },
      );

      await queryInterface.sequelize.query(
        "CREATE TYPE enum_users_role AS ENUM ('admin', 'user');",
        { transaction },
      );

      // Lossy by necessity: the old schema only expresses admin/user, so
      // RECRUITER, INTERVIEWER and CANDIDATE all collapse back to 'user'.
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN role TYPE enum_users_role
           USING (
             (CASE WHEN role = 'ADMIN' THEN 'admin' ELSE 'user' END)::enum_users_role
           );`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';",
        { transaction },
      );
    });
  },
};
