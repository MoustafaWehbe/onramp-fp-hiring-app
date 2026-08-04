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
