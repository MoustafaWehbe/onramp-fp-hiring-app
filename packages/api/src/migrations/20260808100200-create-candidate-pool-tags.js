"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("candidate_pool_tags", {
      pool_entry_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "candidate_pool_entries", key: "id" },
        onDelete: "CASCADE",
      },
      tag_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "candidate_tags", key: "id" },
        onDelete: "CASCADE",
      },
    });

    await queryInterface.addIndex("candidate_pool_tags", ["tag_id"], {
      name: "candidate_pool_tags_tag_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_pool_tags");
  },
};
