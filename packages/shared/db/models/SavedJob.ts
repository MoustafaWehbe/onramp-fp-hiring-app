import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/** A candidate bookmarking a job. */
export interface SavedJobAttributes {
  id: string;
  candidateProfileId: string;
  jobId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SavedJobCreationAttributes = Optional<SavedJobAttributes, "id">;

export class SavedJob
  extends Model<SavedJobAttributes, SavedJobCreationAttributes>
  implements SavedJobAttributes
{
  declare id: string;
  declare candidateProfileId: string;
  declare jobId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof SavedJob {
    SavedJob.init(
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
      },
      {
        sequelize,
        tableName: "saved_jobs",
        timestamps: true,
        underscored: true,
        indexes: [
          // A candidate saves a given job only once.
          {
            unique: true,
            fields: ["candidate_profile_id", "job_id"],
          },
        ],
      },
    );
    return SavedJob;
  }
}
