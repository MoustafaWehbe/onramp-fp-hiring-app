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
  /** Null while the application is a DRAFT; set when the candidate submits. */
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationCreationAttributes = Optional<
  ApplicationAttributes,
  "id" | "stage" | "coverLetter" | "resumeUrl" | "submittedAt"
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
