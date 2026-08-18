import type { PublicJobRecord } from "./jobs";

export type SubscriptionTier = "FREE" | "PRO";

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  location: string | null;
  contact: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  profileComplete: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionStartedAt: string | null;
  subscriptionUpdatedAt: string | null;
}

/**
 * What GET /api/public/companies/:companyId/careers exposes of a company.
 *
 * Deliberately narrower than CompanyProfile: the hiring contact, industry,
 * size, location and profileComplete are authenticated-only, and the server
 * enforces that with its own allow-list. Keeping this type separate is what
 * stops a future edit from rendering a private field on a public page.
 */
export interface PublicCompanyRecord {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
}

export interface CompanyCareersPage {
  company: PublicCompanyRecord;
  jobs: PublicJobRecord[];
}

export interface CompanyProfileInput {
  name: string;
  industry: string;
  size: string;
  location: string;
  contact: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}
