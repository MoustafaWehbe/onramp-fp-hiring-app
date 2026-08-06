import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import {
  clearAuthCookies,
  setAuthCookies,
  REFRESH_COOKIE,
} from "../lib/auth-cookies";

function requireAuthenticatedUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return undefined;
  }

  return req.user;
}

export const authController = {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await authService.login({
        ...req.body,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });
      setAuthCookies(res, accessToken, refreshToken);
      res.json({ data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!refreshToken) {
        res.status(401).json({ error: "Missing refresh token" });
        return;
      }
      const tokens = await authService.refresh(refreshToken);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      res.json({ data: { message: "Token refreshed" } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireAuthenticatedUser(req, res);
      if (!user) {
        return;
      }

      await authService.logout(user.sessionId);
      clearAuthCookies(res);
      res.json({ data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedUser = requireAuthenticatedUser(req, res);
      if (!authenticatedUser) {
        return;
      }

      const user = await authService.getProfile(authenticatedUser.userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Answer the one-time role prompt shown after a first OAuth login.
   *
   * The session is re-issued rather than left alone: authorize() reads the
   * role off the JWT, so a user who picked "recruiter" while holding a
   * candidate token would keep being refused at recruiter routes until the
   * token happened to expire.
   */
  async selectRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authenticatedUser = requireAuthenticatedUser(req, res);
      if (!authenticatedUser) {
        return;
      }

      const user = await authService.selectRole(
        authenticatedUser.userId,
        req.body.role,
      );

      const session = await authService.issueSession(user, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });

      setAuthCookies(res, session.accessToken, session.refreshToken);
      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleSelectionPending: user.roleSelectionPending,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
