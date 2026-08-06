"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("candidate_tags", {
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
      label: { type: Sequelize.STRING(80), allowNull: false },
    });

    await queryInterface.addIndex("candidate_tags", ["company_id", "label"], {
      unique: true,
      name: "candidate_tags_company_id_label_key",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("candidate_tags");
  },
};
