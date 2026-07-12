import { createHash } from "crypto";
import {
  generateTokenPair,
  hashPassword,
  verifyPassword,
  verifyRefreshToken,
  getSequelize,
  User,
  Session,
  RefreshToken,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
  userAgent?: string | string[];
  ipAddress?: string;
}

const DEFAULT_REFRESH_EXPIRES_IN = "7d";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate(): Date {
  const value = process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1]);
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(
    Date.now() + amount * multipliers[match[2] as keyof typeof multipliers],
  );
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await User.findOne({ where: { email: input.email } });

    if (existing) {
      throw createError("Email already in use", 409);
    }

    const passwordHash = await hashPassword(input.password);

    // Role defaults to "user" (the User model's enum default). Product roles
    // (candidate/recruiter/interviewer) are handled in a later branch.
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async login(input: LoginInput) {
    const user = await User.findOne({ where: { email: input.email } });

    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      throw createError("Invalid credentials", 401);
    }

    const expiresAt = refreshExpiryDate();
    const session = await Session.create({
      userId: user.id,
      userAgent: Array.isArray(input.userAgent)
        ? input.userAgent.join(" ")
        : input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt,
    });

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    await RefreshToken.create({
      userId: user.id,
      sessionId: session.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (
      !storedToken ||
      storedToken.userId !== payload.userId ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw createError("Invalid refresh token", 401);
    }

    const session = await Session.findByPk(storedToken.sessionId);

    if (!session || session.expiresAt <= new Date()) {
      throw createError("Invalid refresh token", 401);
    }

    const user = await User.findByPk(storedToken.userId);

    if (!user) {
      throw createError("Invalid refresh token", 401);
    }

    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: storedToken.sessionId,
    });

    // Rotate: revoke the presented token and issue a fresh one atomically.
    await getSequelize().transaction(async (transaction) => {
      await storedToken.update({ revokedAt: new Date() }, { transaction });
      await RefreshToken.create(
        {
          userId: storedToken.userId,
          sessionId: storedToken.sessionId,
          tokenHash: hashToken(tokens.refreshToken),
          expiresAt: refreshExpiryDate(),
        },
        { transaction },
      );
    });

    return tokens;
  }

  async logout(sessionId?: string) {
    if (!sessionId) {
      return;
    }

    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { sessionId, revokedAt: null } },
    );
  }
}

export const authService = new AuthService();
