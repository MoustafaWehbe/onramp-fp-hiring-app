import type { Sequelize } from "sequelize";
import { User } from "./User";
import { Session } from "./Session";
import { RefreshToken } from "./RefreshToken";
import { Company } from "./Company";
import { CandidateProfile } from "./CandidateProfile";
import { WorkExperience } from "./WorkExperience";
import { Skill } from "./Skill";
import { Job } from "./Job";
import { Application } from "./Application";
import { ApplicationNote } from "./ApplicationNote";
import { InterviewAssignment } from "./InterviewAssignment";
import { AIScreening } from "./AIScreening";
import { SavedJob } from "./SavedJob";
import { CandidateSkill } from "./CandidateSkill";
import { JobSkill } from "./JobSkill";

export {
  User,
  Session,
  RefreshToken,
  Company,
  CandidateProfile,
  WorkExperience,
  Skill,
  Job,
  Application,
  ApplicationNote,
  InterviewAssignment,
  AIScreening,
  SavedJob,
  CandidateSkill,
  JobSkill,
};
export { JOB_STATUSES, type JobStatus } from "./Job";
export { APPLICATION_STAGES, type ApplicationStage } from "./Application";

export function initModels(sequelize: Sequelize): void {
  User.initModel(sequelize);
  Session.initModel(sequelize);
  RefreshToken.initModel(sequelize);
  Company.initModel(sequelize);
  CandidateProfile.initModel(sequelize);
  WorkExperience.initModel(sequelize);
  Skill.initModel(sequelize);
  Job.initModel(sequelize);
  Application.initModel(sequelize);
  ApplicationNote.initModel(sequelize);
  InterviewAssignment.initModel(sequelize);
  AIScreening.initModel(sequelize);
  SavedJob.initModel(sequelize);
  CandidateSkill.initModel(sequelize);
  JobSkill.initModel(sequelize);

  // Auth associations
  User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  Session.hasMany(RefreshToken, {
    foreignKey: "sessionId",
    as: "refreshTokens",
  });
  RefreshToken.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

  // Company: internal users and jobs
  Company.hasMany(User, { foreignKey: "companyId", as: "users" });
  User.belongsTo(Company, { foreignKey: "companyId", as: "company" });

  Company.hasMany(Job, { foreignKey: "companyId", as: "jobs" });
  Job.belongsTo(Company, { foreignKey: "companyId", as: "company" });

  // User: candidate profile, authored notes, interview duty, created jobs,
  // generated screenings
  User.hasOne(CandidateProfile, {
    foreignKey: "userId",
    as: "candidateProfile",
  });
  CandidateProfile.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(ApplicationNote, {
    foreignKey: "authorId",
    as: "applicationNotes",
  });
  ApplicationNote.belongsTo(User, { foreignKey: "authorId", as: "author" });

  User.hasMany(InterviewAssignment, {
    foreignKey: "interviewerId",
    as: "interviewAssignments",
  });
  InterviewAssignment.belongsTo(User, {
    foreignKey: "interviewerId",
    as: "interviewer",
  });

  User.hasMany(Job, { foreignKey: "createdById", as: "createdJobs" });
  Job.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

  User.hasMany(AIScreening, {
    foreignKey: "generatedById",
    as: "aiScreenings",
  });
  AIScreening.belongsTo(User, {
    foreignKey: "generatedById",
    as: "generatedBy",
  });

  // CandidateProfile: experience, applications, saved jobs, skills
  CandidateProfile.hasMany(WorkExperience, {
    foreignKey: "candidateProfileId",
    as: "workExperiences",
  });
  WorkExperience.belongsTo(CandidateProfile, {
    foreignKey: "candidateProfileId",
    as: "candidateProfile",
  });

  CandidateProfile.hasMany(Application, {
    foreignKey: "candidateProfileId",
    as: "applications",
  });
  Application.belongsTo(CandidateProfile, {
    foreignKey: "candidateProfileId",
    as: "candidateProfile",
  });

  CandidateProfile.hasMany(SavedJob, {
    foreignKey: "candidateProfileId",
    as: "savedJobs",
  });
  SavedJob.belongsTo(CandidateProfile, {
    foreignKey: "candidateProfileId",
    as: "candidateProfile",
  });

  CandidateProfile.belongsToMany(Skill, {
    through: CandidateSkill,
    foreignKey: "candidateProfileId",
    otherKey: "skillId",
    as: "skills",
  });
  Skill.belongsToMany(CandidateProfile, {
    through: CandidateSkill,
    foreignKey: "skillId",
    otherKey: "candidateProfileId",
    as: "candidateProfiles",
  });

  // Job: tech stack, applications, saves
  Job.belongsToMany(Skill, {
    through: JobSkill,
    foreignKey: "jobId",
    otherKey: "skillId",
    as: "skills",
  });
  Skill.belongsToMany(Job, {
    through: JobSkill,
    foreignKey: "skillId",
    otherKey: "jobId",
    as: "jobs",
  });

  Job.hasMany(Application, { foreignKey: "jobId", as: "applications" });
  Application.belongsTo(Job, { foreignKey: "jobId", as: "job" });

  Job.hasMany(SavedJob, { foreignKey: "jobId", as: "savedJobs" });
  SavedJob.belongsTo(Job, { foreignKey: "jobId", as: "job" });

  // Application: notes, interview assignments, AI screenings
  Application.hasMany(ApplicationNote, {
    foreignKey: "applicationId",
    as: "notes",
  });
  ApplicationNote.belongsTo(Application, {
    foreignKey: "applicationId",
    as: "application",
  });

  Application.hasMany(InterviewAssignment, {
    foreignKey: "applicationId",
    as: "interviewAssignments",
  });
  InterviewAssignment.belongsTo(Application, {
    foreignKey: "applicationId",
    as: "application",
  });

  Application.hasMany(AIScreening, {
    foreignKey: "applicationId",
    as: "aiScreenings",
  });
  AIScreening.belongsTo(Application, {
    foreignKey: "applicationId",
    as: "application",
  });
}
