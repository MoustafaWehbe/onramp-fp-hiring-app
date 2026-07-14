import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CompanyAttributes {
  id: string;
  name: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CompanyCreationAttributes = Optional<
  CompanyAttributes,
  "id" | "website" | "description" | "logoUrl"
>;

export class Company
  extends Model<CompanyAttributes, CompanyCreationAttributes>
  implements CompanyAttributes
{
  declare id: string;
  declare name: string;
  declare website: string | undefined;
  declare description: string | undefined;
  declare logoUrl: string | undefined;
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
