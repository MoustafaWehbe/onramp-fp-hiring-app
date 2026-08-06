import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface ScorecardTemplateAttributes {
  id: string;
  companyId: string;
  title: string;
  /** Recruiter who created it. */
  createdBy: string;
  createdAt?: Date;
}

export type ScorecardTemplateCreationAttributes = Optional<
  ScorecardTemplateAttributes,
  "id"
>;

/** A named, company-scoped set of criteria interviewers score against. */
export class ScorecardTemplate
  extends Model<
    ScorecardTemplateAttributes,
    ScorecardTemplateCreationAttributes
  >
  implements ScorecardTemplateAttributes
{
  declare id: string;
  declare companyId: string;
  declare title: string;
  declare createdBy: string;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof ScorecardTemplate {
    ScorecardTemplate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        companyId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "companies", key: "id" },
          onDelete: "CASCADE",
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
        },
      },
      {
        sequelize,
        tableName: "scorecard_templates",
        timestamps: true,
        updatedAt: false,
        underscored: true,
      },
    );
    return ScorecardTemplate;
  }
}
