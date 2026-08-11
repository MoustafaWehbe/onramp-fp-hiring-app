import type { NextFunction, Request, Response } from "express";
import {
  CALENDAR_OAUTH_STATE_COOKIE,
  clearCalendarOAuthStateCookie,
  setCalendarOAuthStateCookie,
} from "../lib/auth-cookies";
import {
  calendarService,
  CalendarOAuthError,
  type CalendarOAuthErrorCode,
} from "../services/calendar.service";
import { appBaseUrl } from "../services/oauth.service";
import { getCallerCompanyId } from "../lib/company-membership";
import { createError } from "../middleware/error-handler";

function settingsUrl(params: Record<string, string>): string {
  const url = new URL("/recruiter/settings", appBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function calendarError(error: unknown): CalendarOAuthErrorCode {
  if (error instanceof CalendarOAuthError) {
    if (process.env.NODE_ENV !== "test") {
      console.error(`[calendar:oauth] ${error.code}: ${error.message}`);
    }
    return error.code;
  }
  if (process.env.NODE_ENV !== "test") {
    console.error("[calendar:oauth] unexpected failure", error);
  }
  return "provider_error";
}

export const calendarController = {
  connect(req: Request, res: Response): void {
    try {
      const { url, stateToken } = calendarService.buildConnectRequest(
        req.user!.userId,
      );
      setCalendarOAuthStateCookie(res, stateToken);
      res.redirect(url);
    } catch (error) {
      res.redirect(settingsUrl({ calendar_error: calendarError(error) }));
    }
  },

  async callback(req: Request, res: Response): Promise<void> {
    const stateCookie = req.cookies?.[CALENDAR_OAUTH_STATE_COOKIE] as
      | string
      | undefined;
    clearCalendarOAuthStateCookie(res);

    try {
      await calendarService.completeConnect({
        code: typeof req.query.code === "string" ? req.query.code : undefined,
        stateParam:
          typeof req.query.state === "string" ? req.query.state : undefined,
        stateCookie,
        error:
          typeof req.query.error === "string" ? req.query.error : undefined,
      });
      res.redirect(settingsUrl({ calendar: "connected" }));
    } catch (error) {
      res.redirect(settingsUrl({ calendar_error: calendarError(error) }));
    }
  },

  async connection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await calendarService.connectionStatus(req.user!.userId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async disconnect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await calendarService.disconnect(req.user!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);
      if (!companyId) {
        throw createError("You must belong to a company", 403);
      }
      const data = await calendarService.listCompanyInterviews(companyId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
};
