import { DataTypes, Model, type Sequelize, type Optional } from "sequelize";

export interface CandidatePoolEntryAttributes {
  id: string;
  companyId: string;
  candidateId: string;
  addedBy?: string | null;
  addedAt: Date;
  notes?: string | null;
}

export type CandidatePoolEntryCreationAttributes = Optional<
  CandidatePoolEntryAttributes,
  "id" | "addedBy" | "addedAt" | "notes"
>;

export class CandidatePoolEntry
  extends Model<
    CandidatePoolEntryAttributes,
    CandidatePoolEntryCreationAttributes
  >
  implements CandidatePoolEntryAttributes
{
  declare id: string;
  declare companyId: string;
  declare candidateId: string;
  declare addedBy: string | null | undefined;
  declare addedAt: Date;
  declare notes: string | null | undefined;

  static initModel(sequelize: Sequelize): typeof CandidatePoolEntry {
    CandidatePoolEntry.init(
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
        candidateId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "candidate_profiles", key: "id" },
          onDelete: "CASCADE",
        },
        addedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        addedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "candidate_pool_entries",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["company_id", "candidate_id"],
            name: "candidate_pool_entries_company_id_candidate_id_key",
          },
        ],
      },
    );
    return CandidatePoolEntry;
  }
}
