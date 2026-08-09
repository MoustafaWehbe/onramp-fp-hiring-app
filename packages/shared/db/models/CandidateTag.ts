import { DataTypes, Model, type Sequelize, type Optional } from "sequelize";

export interface CandidateTagAttributes {
  id: string;
  companyId: string;
  label: string;
}

export type CandidateTagCreationAttributes = Optional<
  CandidateTagAttributes,
  "id"
>;

export class CandidateTag
  extends Model<CandidateTagAttributes, CandidateTagCreationAttributes>
  implements CandidateTagAttributes
{
  declare id: string;
  declare companyId: string;
  declare label: string;

  static initModel(sequelize: Sequelize): typeof CandidateTag {
    CandidateTag.init(
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
        label: {
          type: DataTypes.STRING(80),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "candidate_tags",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["company_id", "label"],
            name: "candidate_tags_company_id_label_key",
          },
        ],
      },
    );
    return CandidateTag;
  }
}
