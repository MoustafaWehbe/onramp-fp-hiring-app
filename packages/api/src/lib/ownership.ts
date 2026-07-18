    import type { Request, Response, NextFunction } from "express";

/**
 * Answers "does this resource belong to this user?" — separate from
 * authorize(), which only answers "what kind of user is this?". A CANDIDATE
 * role check alone does not stop candidate A from editing candidate B's data;
 * this closes that gap.
 *
 * Resources aren't all owned the same way (a CandidateProfile has a direct
 * userId; a WorkExperience is owned via its parent profile), so ownership is
 * expressed as a caller-supplied loader + an owner-id extractor rather than a
 * fixed shape.
 */

export type ResourceLoader<T> = (req: Request) => Promise<T | null | undefined>;
export type OwnerIdExtractor<T> = (resource: T) => string | null | undefined;

const defaultGetOwnerId = (resource: unknown): string | null | undefined =>
  (resource as { userId?: string | null }).userId;

/**
 * Pure check, usable outside Express (e.g. inside a service method) when a
 * resource has already been loaded.
 */
export function isOwner<T>(
  resource: T | null | undefined,
  userId: string,
  getOwnerId: OwnerIdExtractor<T> = defaultGetOwnerId,
): boolean {
  if (resource == null) {
    return false;
  }

  return getOwnerId(resource) === userId;
}

/**
 * Express middleware factory: loads the resource for this request and
 * confirms it belongs to req.user. On success, the resource is attached to
 * res.locals[resultKey] so the route handler doesn't have to fetch it again.
 *
 * Requires authenticate() to have run first (needs req.user.userId).
 *
 * Non-owned and missing resources both come back as 404 — never 403 — so a
 * candidate probing another candidate's resource id cannot tell the
 * difference between "not yours" and "doesn't exist".
 */
export function ownershipGuard<T>(
  loadResource: ResourceLoader<T>,
  options: {
    getOwnerId?: OwnerIdExtractor<T>;
    resultKey?: string;
    notFoundMessage?: string;
  } = {},
) {
  const getOwnerId = options.getOwnerId ?? defaultGetOwnerId;
  const resultKey = options.resultKey ?? "resource";
  const notFoundMessage = options.notFoundMessage ?? "Not found";

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const resource = await loadResource(req);

      if (!isOwner(resource, req.user.userId, getOwnerId)) {
        res.status(404).json({ error: notFoundMessage });
        return;
      }

      res.locals[resultKey] = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}
