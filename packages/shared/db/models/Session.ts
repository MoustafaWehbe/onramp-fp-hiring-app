import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface SessionAttributes {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SessionCreationAttributes = Optional<
  SessionAttributes,
  "id" | "userAgent" | "ipAddress"
>;

export class Session
  extends Model<SessionAttributes, SessionCreationAttributes>
  implements SessionAttributes
{
  declare id: string;
  declare userId: string;
  declare userAgent: string | undefined;
  declare ipAddress: string | undefined;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Session {
    Session.init(
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
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "sessions",
        timestamps: true,
        underscored: true,
      },
    );
    return Session;
  }
}
