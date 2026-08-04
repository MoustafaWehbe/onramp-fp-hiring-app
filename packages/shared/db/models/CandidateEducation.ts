import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CandidateEducationAttributes {
  id: string;
  candidateProfileId: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  /** Null while the candidate is still studying. */
  endDate?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateEducationCreationAttributes = Optional<
  CandidateEducationAttributes,
  "id" | "degree" | "fieldOfStudy" | "endDate"
>;

export class CandidateEducation
  extends Model<
    CandidateEducationAttributes,
    CandidateEducationCreationAttributes
  >
  implements CandidateEducationAttributes
{
  declare id: string;
  declare candidateProfileId: string;
  declare institution: string;
  declare degree: string | null | undefined;
  declare fieldOfStudy: string | null | undefined;
  declare startDate: string;
  declare endDate: string | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CandidateEducation {
    CandidateEducation.init(
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
        institution: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        degree: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        fieldOfStudy: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "candidate_education",
        timestamps: true,
        underscored: true,
      },
    );
    return CandidateEducation;
  }
}
