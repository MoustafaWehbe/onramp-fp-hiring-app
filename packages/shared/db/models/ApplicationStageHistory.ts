import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import { APPLICATION_STAGES, type ApplicationStage } from "./Application";

export interface ApplicationStageHistoryAttributes {
  id: string;
  applicationId: string;
  /** Null for the entry recording submission — nothing precedes it. */
  fromStage?: ApplicationStage | null;
  toStage: ApplicationStage;
  changedAt: Date;
  /** Null when no person did it: a candidate submitting, or a backfilled row. */
  changedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationStageHistoryCreationAttributes = Optional<
  ApplicationStageHistoryAttributes,
  "id" | "fromStage" | "changedBy" | "changedAt"
>;

/**
 * Append-only. Rows are never updated or deleted except by cascade, so the
 * timeline a candidate sees and the funnel a recruiter sees are reading the
 * same immutable record of what happened.
 */
export class ApplicationStageHistory
  extends Model<
    ApplicationStageHistoryAttributes,
    ApplicationStageHistoryCreationAttributes
  >
  implements ApplicationStageHistoryAttributes
{
  declare id: string;
  declare applicationId: string;
  declare fromStage: ApplicationStage | null | undefined;
  declare toStage: ApplicationStage;
  declare changedAt: Date;
  declare changedBy: string | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof ApplicationStageHistory {
    ApplicationStageHistory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        applicationId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "applications", key: "id" },
          onDelete: "CASCADE",
        },
        fromStage: {
          type: DataTypes.STRING(20),
          allowNull: true,
          validate: {
            isIn: {
              args: [[...APPLICATION_STAGES]],
              msg: `fromStage must be one of: ${APPLICATION_STAGES.join(", ")}`,
            },
          },
        },
        toStage: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: {
              args: [[...APPLICATION_STAGES]],
              msg: `toStage must be one of: ${APPLICATION_STAGES.join(", ")}`,
            },
          },
        },
        changedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        changedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
      },
      {
        sequelize,
        tableName: "application_stage_history",
        timestamps: true,
        underscored: true,
      },
    );
    return ApplicationStageHistory;
  }
}
