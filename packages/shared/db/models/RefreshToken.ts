import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  "id" | "revokedAt"
>;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare sessionId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isRevoked(): boolean {
    return this.revokedAt != null;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked;
  }

  static initModel(sequelize: Sequelize): typeof RefreshToken {
    RefreshToken.init(
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
        sessionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "sessions", key: "id" },
          onDelete: "CASCADE",
        },
        tokenHash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "refresh_tokens",
        timestamps: true,
        underscored: true,
      },
    );
    return RefreshToken;
  }
}
