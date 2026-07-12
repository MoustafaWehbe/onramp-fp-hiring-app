export const USER_ROLES = [
  "ADMIN",
  "RECRUITER",
  "INTERVIEWER",
  "CANDIDATE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
