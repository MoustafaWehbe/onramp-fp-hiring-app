import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface ScorecardCriterionAttributes {
  id: string;
  templateId: string;
  label: string;
  description?: string | null;
  /** Display position within the template; not required to be contiguous. */
  sortOrder: number;
}

export type ScorecardCriterionCreationAttributes = Optional<
  ScorecardCriterionAttributes,
  "id" | "description"
>;

export class ScorecardCriterion
  extends Model<
    ScorecardCriterionAttributes,
    ScorecardCriterionCreationAttributes
  >
  implements ScorecardCriterionAttributes
{
  declare id: string;
  declare templateId: string;
  declare label: string;
  declare description: string | null | undefined;
  declare sortOrder: number;

  static initModel(sequelize: Sequelize): typeof ScorecardCriterion {
    ScorecardCriterion.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        templateId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "scorecard_templates", key: "id" },
          onDelete: "CASCADE",
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "scorecard_criteria",
        timestamps: false,
        underscored: true,
      },
    );
    return ScorecardCriterion;
  }
}
