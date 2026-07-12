import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import { USER_ROLES, type UserRole } from "../../auth/types";

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "role" | "emailVerified"
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare name: string;
  declare role: UserRole;
  declare emailVerified: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        passwordHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING(20),
          defaultValue: "CANDIDATE",
          allowNull: false,
          validate: {
            isIn: {
              args: [[...USER_ROLES]],
              msg: `role must be one of: ${USER_ROLES.join(", ")}`,
            },
          },
        },
        emailVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "users",
        timestamps: true,
        underscored: true,
      },
    );
    return User;
  }
}
