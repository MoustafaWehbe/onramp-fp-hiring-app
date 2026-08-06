"use strict";

const PROVIDER_CHECK = "oauth_identities_provider_check";

/**
 * Third-party sign-in identities (Google, GitHub).
 *
 * One row per (provider, provider account) pair, pointing at the local user.
 * A user may hold several identities, but a provider account can only ever
 * map to one user — that is what the unique (provider, provider_user_id)
 * index enforces, and it is the join key the callback looks up on.
 *
 * `provider` is VARCHAR + CHECK rather than a Postgres enum, matching the
 * choice made for users.role: enums cannot gain values inside a transaction,
 * so adding a third provider later would not be transactional.
 *
 * `users.role_selection_pending` is added here because an OAuth signup has no
 * role to give us — the provider only returns an identity. The column marks
 * the account as awaiting the one-time "hiring or looking for work?" prompt;
 * password signups pick their role in the form and are never pending. Role
 * semantics and company scoping are otherwise untouched.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "oauth_identities",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
            primaryKey: true,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
          },
          provider: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          provider_user_id: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          // The address the provider reported at link time. Kept for support
          // and auditing only — it is never the key we match on, because
          // matching an OAuth login to an account by email is exactly the
          // takeover risk this feature refuses to take.
          email: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE oauth_identities ADD CONSTRAINT ${PROVIDER_CHECK}
           CHECK (provider IN ('google', 'github'));`,
        { transaction },
      );

      await queryInterface.addIndex("oauth_identities", {
        fields: ["provider", "provider_user_id"],
        unique: true,
        name: "oauth_identities_provider_provider_user_id_key",
        transaction,
      });

      await queryInterface.addIndex("oauth_identities", {
        fields: ["user_id"],
        name: "oauth_identities_user_id_idx",
        transaction,
      });

      await queryInterface.addColumn(
        "users",
        "role_selection_pending",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("users", "role_selection_pending", {
        transaction,
      });
      await queryInterface.dropTable("oauth_identities", { transaction });
    });
  },
};
