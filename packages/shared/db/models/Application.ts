import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const APPLICATION_STAGES = [
  "DRAFT",
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const AI_SCORING_STATUSES = [
  "pending",
  "completed",
  "failed",
] as const;
export type AIScoringStatus = (typeof AI_SCORING_STATUSES)[number];

export interface ApplicationAttributes {
  id: string;
  jobId: string;
  candidateProfileId: string;
  /**
   * DRAFT is the "save your progress" state: visible only to its candidate
   * and never surfaced in a recruiter pipeline.
   */
  stage: ApplicationStage;
  coverLetter?: string;
  /** Snapshot of the candidate's resume URL at the time of applying. */
  resumeUrl?: string;
  /** Private storage key for the CV uploaded for this application. */
  resumeFileUrl?: string | null;
  resumeOriginalFilename?: string | null;
  resumeText?: string | null;
  parsedYearsExperience?: number | null;
  parsedSkills?: string[] | null;
  resumeUploadedAt?: Date | null;
  fitScore?: number | null;
  aiSummary?: string | null;
  aiStrengths?: string[] | null;
  aiGaps?: string[] | null;
  aiScoredAt?: Date | null;
  aiScoringStatus: AIScoringStatus;
  /** Optional — a candidate can sit in INTERVIEWING with no date agreed yet. */
  interviewDate?: Date | null;
  /** Free text, latest-wins. Editable at any stage, not just INTERVIEWING. */
  recruiterNotes?: string | null;
  /** Audit stamp of when interviewDate was first set; survives a later clear. */
  interviewScheduledAt?: Date | null;
  /** Null while the application is a DRAFT; set when the candidate submits. */
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationCreationAttributes = Optional<
  ApplicationAttributes,
  | "id"
  | "stage"
  | "coverLetter"
  | "resumeUrl"
  | "resumeFileUrl"
  | "resumeOriginalFilename"
  | "resumeText"
  | "parsedYearsExperience"
  | "parsedSkills"
  | "resumeUploadedAt"
  | "fitScore"
  | "aiSummary"
  | "aiStrengths"
  | "aiGaps"
  | "aiScoredAt"
  | "aiScoringStatus"
  | "interviewDate"
  | "recruiterNotes"
  | "interviewScheduledAt"
  | "submittedAt"
>;

export class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  declare id: string;
  declare jobId: string;
  declare candidateProfileId: string;
  declare stage: ApplicationStage;
  declare coverLetter: string | undefined;
  declare resumeUrl: string | undefined;
  declare resumeFileUrl: string | null | undefined;
  declare resumeOriginalFilename: string | null | undefined;
  declare resumeText: string | null | undefined;
  declare parsedYearsExperience: number | null | undefined;
  declare parsedSkills: string[] | null | undefined;
  declare resumeUploadedAt: Date | null | undefined;
  declare fitScore: number | null | undefined;
  declare aiSummary: string | null | undefined;
  declare aiStrengths: string[] | null | undefined;
  declare aiGaps: string[] | null | undefined;
  declare aiScoredAt: Date | null | undefined;
  declare aiScoringStatus: AIScoringStatus;
  declare interviewDate: Date | null | undefined;
  declare recruiterNotes: string | null | undefined;
  declare interviewScheduledAt: Date | null | undefined;
  declare submittedAt: Date | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Application {
    Application.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        jobId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "jobs", key: "id" },
          onDelete: "CASCADE",
        },
        candidateProfileId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "candidate_profiles", key: "id" },
          onDelete: "CASCADE",
        },
        stage: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [[...APPLICATION_STAGES]],
              msg: `stage must be one of: ${APPLICATION_STAGES.join(", ")}`,
            },
          },
        },
        coverLetter: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        resumeUrl: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
        resumeFileUrl: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
        resumeOriginalFilename: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        resumeText: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        parsedYearsExperience: {
          type: DataTypes.DECIMAL(4, 1),
          allowNull: true,
          get() {
            const value = this.getDataValue("parsedYearsExperience");
            return value === undefined || value === null ? null : Number(value);
          },
        },
        parsedSkills: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        resumeUploadedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        fitScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: { min: 0, max: 100 },
        },
        aiSummary: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        aiStrengths: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        aiGaps: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        aiScoredAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        aiScoringStatus: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "pending",
          validate: {
            isIn: {
              args: [[...AI_SCORING_STATUSES]],
              msg: `aiScoringStatus must be one of: ${AI_SCORING_STATUSES.join(", ")}`,
            },
          },
        },
        interviewDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        recruiterNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        interviewScheduledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        submittedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "applications",
        timestamps: true,
        underscored: true,
        indexes: [
          // A candidate applies to a given job only once.
          {
            unique: true,
            fields: ["job_id", "candidate_profile_id"],
          },
        ],
      },
    );
    return Application;
  }
}
