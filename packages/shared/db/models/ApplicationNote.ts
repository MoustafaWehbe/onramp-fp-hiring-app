import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/**
 * Internal recruiter/interviewer note on an application.
 * INTERNAL ONLY — never exposed to candidates.
 */
export interface ApplicationNoteAttributes {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationNoteCreationAttributes = Optional<
  ApplicationNoteAttributes,
  "id" | "rating"
>;

export class ApplicationNote
  extends Model<ApplicationNoteAttributes, ApplicationNoteCreationAttributes>
  implements ApplicationNoteAttributes
{
  declare id: string;
  declare applicationId: string;
  declare authorId: string;
  declare content: string;
  declare rating: number | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof ApplicationNote {
    ApplicationNote.init(
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
        authorId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: { min: 1, max: 5 },
        },
      },
      {
        sequelize,
        tableName: "application_notes",
        timestamps: true,
        underscored: true,
      },
    );
    return ApplicationNote;
  }
}
