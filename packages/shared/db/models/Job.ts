import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const JOB_STATUSES = ["OPEN", "CLOSED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobAttributes {
  id: string;
  companyId: string;
  createdById: string;
  title: string;
  description: string;
  location?: string;
  status: JobStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobCreationAttributes = Optional<
  JobAttributes,
  "id" | "location" | "status"
>;

export class Job
  extends Model<JobAttributes, JobCreationAttributes>
  implements JobAttributes
{
  declare id: string;
  declare companyId: string;
  declare createdById: string;
  declare title: string;
  declare description: string;
  declare location: string | undefined;
  declare status: JobStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Job {
    Job.init(
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
        createdById: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "OPEN",
          validate: {
            isIn: {
              args: [[...JOB_STATUSES]],
              msg: `status must be one of: ${JOB_STATUSES.join(", ")}`,
            },
          },
        },
      },
      {
        sequelize,
        tableName: "jobs",
        timestamps: true,
        underscored: true,
      },
    );
    return Job;
  }
}
