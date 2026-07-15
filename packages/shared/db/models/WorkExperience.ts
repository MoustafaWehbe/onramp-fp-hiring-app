import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface WorkExperienceAttributes {
  id: string;
  candidateProfileId: string;
  company: string;
  title: string;
  startDate: string;
  /** Null while this is the candidate's current role. */
  endDate?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WorkExperienceCreationAttributes = Optional<
  WorkExperienceAttributes,
  "id" | "endDate" | "description"
>;

export class WorkExperience
  extends Model<WorkExperienceAttributes, WorkExperienceCreationAttributes>
  implements WorkExperienceAttributes
{
  declare id: string;
  declare candidateProfileId: string;
  declare company: string;
  declare title: string;
  declare startDate: string;
  declare endDate: string | undefined;
  declare description: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof WorkExperience {
    WorkExperience.init(
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
        company: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "work_experiences",
        timestamps: true,
        underscored: true,
      },
    );
    return WorkExperience;
  }
}
