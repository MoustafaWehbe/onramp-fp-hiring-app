import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CandidateProfileAttributes {
  id: string;
  userId: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateProfileCreationAttributes = Optional<
  CandidateProfileAttributes,
  "id" | "headline" | "bio" | "phone" | "location" | "resumeUrl"
>;

export class CandidateProfile
  extends Model<CandidateProfileAttributes, CandidateProfileCreationAttributes>
  implements CandidateProfileAttributes
{
  declare id: string;
  declare userId: string;
  declare headline: string | undefined;
  declare bio: string | undefined;
  declare phone: string | undefined;
  declare location: string | undefined;
  declare resumeUrl: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CandidateProfile {
    CandidateProfile.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        headline: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        resumeUrl: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "candidate_profiles",
        timestamps: true,
        underscored: true,
      },
    );
    return CandidateProfile;
  }
}
