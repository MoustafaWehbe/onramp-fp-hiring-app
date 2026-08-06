import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return (
    typeof value === "string" &&
    (OAUTH_PROVIDERS as readonly string[]).includes(value)
  );
}

export interface OAuthIdentityAttributes {
  id: string;
  userId: string;
  provider: OAuthProvider;
  /** The provider's own stable id for the account ("sub" on Google). */
  providerUserId: string;
  /** Address reported by the provider at link time; informational only. */
  email?: string | null;
  createdAt?: Date;
}

export type OAuthIdentityCreationAttributes = Optional<
  OAuthIdentityAttributes,
  "id" | "email"
>;

export class OAuthIdentity
  extends Model<OAuthIdentityAttributes, OAuthIdentityCreationAttributes>
  implements OAuthIdentityAttributes
{
  declare id: string;
  declare userId: string;
  declare provider: OAuthProvider;
  declare providerUserId: string;
  declare email: string | null | undefined;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof OAuthIdentity {
    OAuthIdentity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        provider: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: {
              args: [[...OAUTH_PROVIDERS]],
              msg: `provider must be one of: ${OAUTH_PROVIDERS.join(", ")}`,
            },
          },
        },
        providerUserId: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "oauth_identities",
        timestamps: true,
        // An identity is created once and never edited: it either points at
        // the user or it is deleted. There is no updated_at column.
        updatedAt: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["provider", "provider_user_id"],
            name: "oauth_identities_provider_provider_user_id_key",
          },
        ],
      },
    );
    return OAuthIdentity;
  }
}
