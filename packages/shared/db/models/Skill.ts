import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface SkillAttributes {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SkillCreationAttributes = Optional<SkillAttributes, "id">;

export class Skill
  extends Model<SkillAttributes, SkillCreationAttributes>
  implements SkillAttributes
{
  declare id: string;
  declare name: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Skill {
    Skill.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
      },
      {
        sequelize,
        tableName: "skills",
        timestamps: true,
        underscored: true,
      },
    );
    return Skill;
  }
}
