import { Model, DataTypes, type Sequelize } from "sequelize";

/** Junction: Job <-> Skill (the job's tech stack). Composite PK, no surrogate id. */
export interface JobSkillAttributes {
  jobId: string;
  skillId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobSkillCreationAttributes = JobSkillAttributes;

export class JobSkill
  extends Model<JobSkillAttributes, JobSkillCreationAttributes>
  implements JobSkillAttributes
{
  declare jobId: string;
  declare skillId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof JobSkill {
    JobSkill.init(
      {
        jobId: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: { model: "jobs", key: "id" },
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
        tableName: "job_skills",
        timestamps: true,
        underscored: true,
      },
    );
    return JobSkill;
  }
}
