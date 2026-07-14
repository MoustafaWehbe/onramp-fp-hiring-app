import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/**
 * AI-generated screening of an application.
 * INTERNAL ONLY — never exposed to candidates. The cost fields (model,
 * tokensUsed, costUsd) are additionally hidden from INTERVIEWER; the
 * response-stripping middleware lands in a later PR.
 */
export interface AIScreeningAttributes {
  id: string;
  applicationId: string;
  /** Null when the screening was produced by an unattended background job. */
  generatedById?: string;
  coreAlignment: string;
  strengths: string[];
  skillsGaps: string[];
  interviewQuestions: string[];
  /** 0–100, used to rank candidates within a job's pipeline. */
  fitScore?: number;
  // --- Cost fields: RECRUITER/ADMIN only, stripped for INTERVIEWER ---
  model?: string;
  tokensUsed?: number;
  /** DECIMAL(10,4); pg returns decimals as strings. */
  costUsd?: string;
  // --- End cost fields ---
  createdAt?: Date;
  updatedAt?: Date;
}

export type AIScreeningCreationAttributes = Optional<
  AIScreeningAttributes,
  "id" | "generatedById" | "fitScore" | "model" | "tokensUsed" | "costUsd"
>;

export class AIScreening
  extends Model<AIScreeningAttributes, AIScreeningCreationAttributes>
  implements AIScreeningAttributes
{
  declare id: string;
  declare applicationId: string;
  declare generatedById: string | undefined;
  declare coreAlignment: string;
  declare strengths: string[];
  declare skillsGaps: string[];
  declare interviewQuestions: string[];
  declare fitScore: number | undefined;
  declare model: string | undefined;
  declare tokensUsed: number | undefined;
  declare costUsd: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof AIScreening {
    AIScreening.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        applicationId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "applications", key: "id" },
          onDelete: "CASCADE",
        },
        generatedById: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        coreAlignment: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        strengths: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
        },
        skillsGaps: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
        },
        interviewQuestions: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
        },
        fitScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: { min: 0, max: 100 },
        },
        // --- Cost fields: RECRUITER/ADMIN only, stripped for INTERVIEWER ---
        model: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        tokensUsed: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        costUsd: {
          type: DataTypes.DECIMAL(10, 4),
          allowNull: true,
        },
        // --- End cost fields ---
      },
      {
        sequelize,
        tableName: "ai_screenings",
        timestamps: true,
        underscored: true,
      },
    );
    return AIScreening;
  }
}
