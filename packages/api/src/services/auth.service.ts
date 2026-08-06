import { createHash } from "crypto";
import {
  generateTokenPair,
  hashPassword,
  verifyPassword,
  verifyRefreshToken,
  type SelfAssignableRole,
} from "@starter-kit/shared/auth";
import {
  getSequelize,
  User,
  Session,
  RefreshToken,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: SelfAssignableRole;
}

interface LoginInput {
  email: string;
  password: string;
  userAgent?: string | string[];
  ipAddress?: string;
}

export interface SessionRequestContext {
  userAgent?: string | string[];
  ipAddress?: string;
}

export interface IssuedSession {
  user: { id: string; email: string; name: string; role: string };
  accessToken: string;
  refreshToken: string;
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

    // ADMIN can never arrive here: the register schema only admits
    // self-assignable roles.
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? "CANDIDATE",
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Open a session for an already-authenticated user and mint its token pair.
   *
   * Split out of login() so that every way of proving identity — password
   * today, an OAuth provider callback next door — converges on one session
   * shape. Callers are responsible for the proving; by the time a user
   * reaches this method the question of "is this really them?" is settled.
   */
  async issueSession(
    user: User,
    context: SessionRequestContext = {},
  ): Promise<IssuedSession> {
    const expiresAt = refreshExpiryDate();
    const session = await Session.create({
      userId: user.id,
      userAgent: Array.isArray(context.userAgent)
        ? context.userAgent.join(" ")
        : context.userAgent,
      ipAddress: context.ipAddress,
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

  async login(input: LoginInput) {
    const user = await User.findOne({ where: { email: input.email } });

    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      throw createError("Invalid credentials", 401);
    }

    return this.issueSession(user, {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
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
      roleSelectionPending: user.roleSelectionPending,
    };
  }

  /**
   * Answer the one-time "hiring or looking for work?" prompt.
   *
   * Only reachable by accounts still flagged pending — that is, OAuth
   * signups that have never picked. It is not a general role-change endpoint:
   * a second call finds the flag already cleared and is refused, so the
   * prompt cannot be replayed to escalate a candidate into a recruiter later.
   * The role set is SELF_ASSIGNABLE_ROLES, the same list the registration
   * schema admits, so ADMIN stays unreachable here too.
   */
  async selectRole(userId: string, role: SelfAssignableRole): Promise<User> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    if (!user.roleSelectionPending) {
      throw createError("Role has already been selected", 409);
    }

    await user.update({ role, roleSelectionPending: false });

    return user;
  }

  async refresh(refreshToken: string) {
    let payload: ReturnType<typeof verifyRefreshToken>;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw createError("Invalid refresh token", 401);
    }

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
