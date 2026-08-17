import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const SUBSCRIPTION_TIERS = ["FREE", "PRO"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export interface CompanyAttributes {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  contact?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStartedAt?: Date;
  subscriptionUpdatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CompanyCreationAttributes = Optional<
  CompanyAttributes,
  | "id"
  | "industry"
  | "size"
  | "location"
  | "contact"
  | "website"
  | "description"
  | "logoUrl"
  | "subscriptionTier"
  | "subscriptionStartedAt"
  | "subscriptionUpdatedAt"
>;

export class Company
  extends Model<CompanyAttributes, CompanyCreationAttributes>
  implements CompanyAttributes
{
  declare id: string;
  declare name: string;
  declare industry: string | undefined;
  declare size: string | undefined;
  declare location: string | undefined;
  declare contact: string | undefined;
  declare website: string | undefined;
  declare description: string | undefined;
  declare logoUrl: string | undefined;
  declare subscriptionTier: SubscriptionTier;
  declare subscriptionStartedAt: Date | undefined;
  declare subscriptionUpdatedAt: Date | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Company {
    Company.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        industry: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        size: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        contact: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        website: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        logoUrl: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },
        subscriptionTier: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "FREE",
          validate: {
            isIn: {
              args: [[...SUBSCRIPTION_TIERS]],
              msg: `subscriptionTier must be one of: ${SUBSCRIPTION_TIERS.join(", ")}`,
            },
          },
        },
        subscriptionStartedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        subscriptionUpdatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "companies",
        timestamps: true,
        underscored: true,
      },
    );
    return Company;
  }
}
