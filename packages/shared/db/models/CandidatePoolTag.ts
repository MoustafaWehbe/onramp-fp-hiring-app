import { DataTypes, Model, type Sequelize } from "sequelize";

export interface CandidatePoolTagAttributes {
  poolEntryId: string;
  tagId: string;
}

export class CandidatePoolTag
  extends Model<CandidatePoolTagAttributes>
  implements CandidatePoolTagAttributes
{
  declare poolEntryId: string;
  declare tagId: string;

  static initModel(sequelize: Sequelize): typeof CandidatePoolTag {
    CandidatePoolTag.init(
      {
        poolEntryId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "candidate_pool_entries", key: "id" },
          onDelete: "CASCADE",
        },
        tagId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "candidate_tags", key: "id" },
          onDelete: "CASCADE",
        },
      },
      {
        sequelize,
        tableName: "candidate_pool_tags",
        timestamps: false,
        underscored: true,
      },
    );
    return CandidatePoolTag;
  }
}
