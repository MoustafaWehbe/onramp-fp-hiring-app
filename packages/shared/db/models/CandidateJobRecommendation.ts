import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CandidateJobRecommendationAttributes {
  id: string;
  candidateProfileId: string;
  jobId: string;
  score: number;
  reason?: string | null;
  matchedSkills?: string[] | null;
  computedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateJobRecommendationCreationAttributes = Optional<
  CandidateJobRecommendationAttributes,
  "id" | "reason" | "matchedSkills" | "computedAt"
>;

/**
 * A cache of scores, refreshed by a background job. Nothing here is
 * authoritative: the read path re-checks that each job is still OPEN and that
 * the candidate has not since applied, because either can change after a row
 * is written.
 */
export class CandidateJobRecommendation
  extends Model<
    CandidateJobRecommendationAttributes,
    CandidateJobRecommendationCreationAttributes
  >
  implements CandidateJobRecommendationAttributes
{
  declare id: string;
  declare candidateProfileId: string;
  declare jobId: string;
  declare score: number;
  declare reason: string | null | undefined;
  declare matchedSkills: string[] | null | undefined;
  declare computedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CandidateJobRecommendation {
    CandidateJobRecommendation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        candidateProfileId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "candidate_profiles", key: "id" },
          onDelete: "CASCADE",
        },
        jobId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "jobs", key: "id" },
          onDelete: "CASCADE",
        },
        score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0, max: 100 },
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        matchedSkills: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        computedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "candidate_job_recommendations",
        timestamps: true,
        underscored: true,
        indexes: [
          { unique: true, fields: ["candidate_profile_id", "job_id"] },
        ],
      },
    );
    return CandidateJobRecommendation;
  }
}
