import { Model, DataTypes, type Sequelize } from "sequelize";

/** Junction: CandidateProfile <-> Skill. Composite PK, no surrogate id. */
export interface CandidateSkillAttributes {
  candidateProfileId: string;
  skillId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateSkillCreationAttributes = CandidateSkillAttributes;

export class CandidateSkill
  extends Model<CandidateSkillAttributes, CandidateSkillCreationAttributes>
  implements CandidateSkillAttributes
{
  declare candidateProfileId: string;
  declare skillId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CandidateSkill {
    CandidateSkill.init(
      {
        candidateProfileId: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: { model: "candidate_profiles", key: "id" },
          onDelete: "CASCADE",
        },
        skillId: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: { model: "skills", key: "id" },
          onDelete: "CASCADE",
        },
      },
      {
        sequelize,
        tableName: "candidate_skills",
        timestamps: true,
        underscored: true,
      },
    );
    return CandidateSkill;
  }
}
