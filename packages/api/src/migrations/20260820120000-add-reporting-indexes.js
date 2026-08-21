"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("applications", ["submitted_at", "job_id"], {
      name: "applications_submitted_at_job_id",
    });
    await queryInterface.addIndex("applications", ["hired_at", "job_id"], {
      name: "applications_hired_at_job_id",
    });
    await queryInterface.addIndex("applications", ["interview_scheduled_at", "job_id"], {
      name: "applications_interview_scheduled_at_job_id",
    });
    await queryInterface.addIndex("interview_scorecards", ["submitted_at", "application_id"], {
      name: "interview_scorecards_submitted_at_application_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("interview_scorecards", "interview_scorecards_submitted_at_application_id");
    await queryInterface.removeIndex("applications", "applications_interview_scheduled_at_job_id");
    await queryInterface.removeIndex("applications", "applications_hired_at_job_id");
    await queryInterface.removeIndex("applications", "applications_submitted_at_job_id");
  },
};
