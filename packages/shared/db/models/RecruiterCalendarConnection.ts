import { DataTypes, Model, type Sequelize } from "sequelize";

export interface RecruiterCalendarConnectionAttributes {
  recruiterId: string;
  /** AES-256-GCM ciphertext; never a provider token in plaintext. */
  googleRefreshToken: string;
  googleEmail: string;
  connectedAt: Date;
}

export class RecruiterCalendarConnection
  extends Model<RecruiterCalendarConnectionAttributes>
  implements RecruiterCalendarConnectionAttributes
{
  declare recruiterId: string;
  declare googleRefreshToken: string;
  declare googleEmail: string;
  declare connectedAt: Date;

  static initModel(sequelize: Sequelize): typeof RecruiterCalendarConnection {
    RecruiterCalendarConnection.init(
      {
        recruiterId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        googleRefreshToken: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        googleEmail: {
          type: DataTypes.STRING(320),
          allowNull: false,
        },
        connectedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "recruiter_calendar_connections",
        timestamps: false,
        underscored: true,
      },
    );

    return RecruiterCalendarConnection;
  }
}
