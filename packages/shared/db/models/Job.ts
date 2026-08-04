import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const JOB_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export interface JobAttributes {
  id: string;
  companyId: string;
  createdById: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  location?: string;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  status: JobStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobCreationAttributes = Optional<
  JobAttributes,
  | "id"
  | "employmentType"
  | "experienceMin"
  | "experienceMax"
  | "location"
  | "isRemote"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
  | "status"
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
  declare employmentType: EmploymentType;
  declare experienceMin: number;
  declare experienceMax: number;
  declare location: string | undefined;
  declare isRemote: boolean;
  declare salaryMin: number;
  declare salaryMax: number;
  declare salaryCurrency: string;
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
        employmentType: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "FULL_TIME",
          validate: {
            isIn: {
              args: [[...EMPLOYMENT_TYPES]],
              msg: `employmentType must be one of: ${EMPLOYMENT_TYPES.join(", ")}`,
            },
          },
        },
        experienceMin: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0 },
        },
        experienceMax: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0 },
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        isRemote: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        salaryMin: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0 },
        },
        salaryMax: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0 },
        },
        salaryCurrency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: "USD",
          validate: {
            is: {
              args: /^[A-Z]{3}$/,
              msg: "salaryCurrency must be a 3-letter uppercase code",
            },
          },
        },
        status: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "DRAFT",
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
