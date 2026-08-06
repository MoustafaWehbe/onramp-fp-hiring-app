import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export const NOTIFICATION_TYPES = [
  "new_application",
  "stage_change",
  "invite_to_apply",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationAttributes {
  id: string;
  /** Recipient. One row per user, so read state needs no join table. */
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Nulled when the application goes away; click-through then 404s. */
  relatedApplicationId?: string | null;
  /** Direct job link for invitations, which deliberately have no application. */
  relatedJobId?: string | null;
  /** Null means unread. */
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  "id" | "body" | "relatedApplicationId" | "relatedJobId" | "readAt"
>;

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: string;
  declare userId: string;
  declare type: NotificationType;
  declare title: string;
  declare body: string | null | undefined;
  declare relatedApplicationId: string | null | undefined;
  declare relatedJobId: string | null | undefined;
  declare readAt: Date | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Notification {
    Notification.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        type: {
          type: DataTypes.STRING(40),
          allowNull: false,
          validate: {
            isIn: {
              args: [[...NOTIFICATION_TYPES]],
              msg: `type must be one of: ${NOTIFICATION_TYPES.join(", ")}`,
            },
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        relatedApplicationId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "applications", key: "id" },
          onDelete: "SET NULL",
        },
        relatedJobId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "jobs", key: "id" },
          onDelete: "SET NULL",
        },
        readAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "notifications",
        timestamps: true,
        underscored: true,
      },
    );
    return Notification;
  }
}
