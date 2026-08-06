import type { Sequelize } from "sequelize";
import { User } from "./User";
import { Session } from "./Session";
import { RefreshToken } from "./RefreshToken";
import { OAuthIdentity } from "./OAuthIdentity";
import { Company } from "./Company";
import { CandidateProfile } from "./CandidateProfile";
import { CandidateEducation } from "./CandidateEducation";
import { WorkExperience } from "./WorkExperience";
import { Skill } from "./Skill";
import { Job } from "./Job";
import { Application } from "./Application";
import { ApplicationStageHistory } from "./ApplicationStageHistory";
import { CandidateJobRecommendation } from "./CandidateJobRecommendation";
import { ApplicationNote } from "./ApplicationNote";
import { InterviewAssignment } from "./InterviewAssignment";
import { AIScreening } from "./AIScreening";
import { Notification } from "./Notification";
import { SavedJob } from "./SavedJob";
import { CandidateSkill } from "./CandidateSkill";
import { JobSkill } from "./JobSkill";
import { ScorecardTemplate } from "./ScorecardTemplate";
import { ScorecardCriterion } from "./ScorecardCriterion";
import { InterviewScorecard } from "./InterviewScorecard";
import { ScorecardRating } from "./ScorecardRating";

export {
  User,
  Session,
  RefreshToken,
  OAuthIdentity,
  Company,
  CandidateProfile,
  CandidateEducation,
  CandidateJobRecommendation,
  WorkExperience,
  Skill,
  Job,
  Application,
  ApplicationStageHistory,
  ApplicationNote,
  InterviewAssignment,
  AIScreening,
  Notification,
  SavedJob,
  CandidateSkill,
  JobSkill,
  ScorecardTemplate,
  ScorecardCriterion,
  InterviewScorecard,
  ScorecardRating,
};
export {
  RATING_MIN,
  RATING_MAX,
} from "./ScorecardRating";
export {
  OAUTH_PROVIDERS,
  isOAuthProvider,
  type OAuthProvider,
} from "./OAuthIdentity";
export {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  type EmploymentType,
  type JobStatus,
} from "./Job";
export {
  AI_SCORING_STATUSES,
  APPLICATION_STAGES,
  type AIScoringStatus,
  type ApplicationStage,
} from "./Application";
export {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "./Notification";

export function initModels(sequelize: Sequelize): void {
  User.initModel(sequelize);
  Session.initModel(sequelize);
  RefreshToken.initModel(sequelize);
  OAuthIdentity.initModel(sequelize);
  Company.initModel(sequelize);
  CandidateProfile.initModel(sequelize);
  CandidateEducation.initModel(sequelize);
  CandidateJobRecommendation.initModel(sequelize);
  WorkExperience.initModel(sequelize);
  Skill.initModel(sequelize);
  Job.initModel(sequelize);
  Application.initModel(sequelize);
  ApplicationStageHistory.initModel(sequelize);
  ApplicationNote.initModel(sequelize);
  InterviewAssignment.initModel(sequelize);
  AIScreening.initModel(sequelize);
  Notification.initModel(sequelize);
  SavedJob.initModel(sequelize);
  CandidateSkill.initModel(sequelize);
  JobSkill.initModel(sequelize);
  ScorecardTemplate.initModel(sequelize);
  ScorecardCriterion.initModel(sequelize);
  InterviewScorecard.initModel(sequelize);
  ScorecardRating.initModel(sequelize);

  // Auth associations
  User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(OAuthIdentity, { foreignKey: "userId", as: "oauthIdentities" });
  OAuthIdentity.belongsTo(User, { foreignKey: "userId", as: "user" });

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

  User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

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

  CandidateProfile.hasMany(CandidateEducation, {
    foreignKey: "candidateProfileId",
    as: "education",
  });
  CandidateEducation.belongsTo(CandidateProfile, {
    foreignKey: "candidateProfileId",
    as: "candidateProfile",
  });

  CandidateProfile.hasMany(CandidateJobRecommendation, {
    foreignKey: "candidateProfileId",
    as: "jobRecommendations",
  });
  CandidateJobRecommendation.belongsTo(CandidateProfile, {
    foreignKey: "candidateProfileId",
    as: "candidateProfile",
  });

  Job.hasMany(CandidateJobRecommendation, {
    foreignKey: "jobId",
    as: "candidateRecommendations",
  });
  CandidateJobRecommendation.belongsTo(Job, {
    foreignKey: "jobId",
    as: "job",
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

  // Application: stage history, notes, interview assignments, AI screenings
  Application.hasMany(ApplicationStageHistory, {
    foreignKey: "applicationId",
    as: "stageHistory",
  });
  ApplicationStageHistory.belongsTo(Application, {
    foreignKey: "applicationId",
    as: "application",
  });

  User.hasMany(ApplicationStageHistory, {
    foreignKey: "changedBy",
    as: "stageChanges",
  });
  ApplicationStageHistory.belongsTo(User, {
    foreignKey: "changedBy",
    as: "changedByUser",
  });

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

  // Interview scorecards: templates belong to a company, criteria to a
  // template, and a submitted scorecard joins an application to the recruiter
  // who filled it in.
  Company.hasMany(ScorecardTemplate, {
    foreignKey: "companyId",
    as: "scorecardTemplates",
  });
  ScorecardTemplate.belongsTo(Company, {
    foreignKey: "companyId",
    as: "company",
  });

  ScorecardTemplate.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
  });

  ScorecardTemplate.hasMany(ScorecardCriterion, {
    foreignKey: "templateId",
    as: "criteria",
  });
  ScorecardCriterion.belongsTo(ScorecardTemplate, {
    foreignKey: "templateId",
    as: "template",
  });

  ScorecardTemplate.hasMany(InterviewScorecard, {
    foreignKey: "templateId",
    as: "scorecards",
  });
  InterviewScorecard.belongsTo(ScorecardTemplate, {
    foreignKey: "templateId",
    as: "template",
  });

  Application.hasMany(InterviewScorecard, {
    foreignKey: "applicationId",
    as: "scorecards",
  });
  InterviewScorecard.belongsTo(Application, {
    foreignKey: "applicationId",
    as: "application",
  });

  User.hasMany(InterviewScorecard, {
    foreignKey: "interviewerId",
    as: "submittedScorecards",
  });
  InterviewScorecard.belongsTo(User, {
    foreignKey: "interviewerId",
    as: "interviewer",
  });

  InterviewScorecard.hasMany(ScorecardRating, {
    foreignKey: "scorecardId",
    as: "ratings",
  });
  ScorecardRating.belongsTo(InterviewScorecard, {
    foreignKey: "scorecardId",
    as: "scorecard",
  });

  ScorecardCriterion.hasMany(ScorecardRating, {
    foreignKey: "criterionId",
    as: "ratings",
  });
  ScorecardRating.belongsTo(ScorecardCriterion, {
    foreignKey: "criterionId",
    as: "criterion",
  });

  Application.hasMany(Notification, {
    foreignKey: "relatedApplicationId",
    as: "notifications",
  });
  Notification.belongsTo(Application, {
    foreignKey: "relatedApplicationId",
    as: "relatedApplication",
  });
}
