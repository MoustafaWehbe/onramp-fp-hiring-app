import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/** Free-form external links; the key is the label the candidate chose. */
export type CandidateProfileLinks = Record<string, string>;

export interface CandidateProfileAttributes {
  id: string;
  userId: string;
  headline?: string;
  /** Doubles as the profile summary — the field the profile page renders. */
  bio?: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
  links?: CandidateProfileLinks | null;
  profilePhotoUrl?: string | null;
  /**
   * When the one-time seed from parsed resume data ran. Seeding is gated on
   * this being null, which is what keeps a later re-parse from overwriting
   * anything the candidate has edited since.
   */
  profileSeededAt?: Date | null;
  /**
   * When a recommendations scoring pass last completed for this profile,
   * regardless of whether it produced any rows. Distinguishes "never
   * scored yet" from "scored, currently nothing eligible" (e.g. every open
   * job has been applied to) — the candidate_job_recommendations table looks
   * identical (empty) in both cases.
   */
  recommendationsComputedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateProfileCreationAttributes = Optional<
  CandidateProfileAttributes,
  | "id"
  | "headline"
  | "bio"
  | "phone"
  | "location"
  | "resumeUrl"
  | "links"
  | "profilePhotoUrl"
  | "profileSeededAt"
  | "recommendationsComputedAt"
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
  declare links: CandidateProfileLinks | null | undefined;
  declare profilePhotoUrl: string | null | undefined;
  declare profileSeededAt: Date | null | undefined;
  declare recommendationsComputedAt: Date | null | undefined;
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
        links: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        profilePhotoUrl: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
        profileSeededAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        recommendationsComputedAt: {
          type: DataTypes.DATE,
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
