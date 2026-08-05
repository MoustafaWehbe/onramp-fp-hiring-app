import { apiClient } from "../../lib/api-client";
import type {
  CompanyCareersPage,
  CompanyProfile,
  CompanyProfileInput,
} from "../../types/company";

interface Envelope<T> {
  data: T;
}

/** Public — no session required, unlike everything else in this module. */
export async function getCompanyCareersPage(
  companyId: string,
): Promise<CompanyCareersPage> {
  const { data } = await apiClient.get<Envelope<CompanyCareersPage>>(
    `/public/companies/${companyId}/careers`,
  );
  return data.data;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const { data } =
    await apiClient.get<Envelope<CompanyProfile>>("/companies/me");
  return data.data;
}

export async function createCompanyProfile(
  input: CompanyProfileInput,
): Promise<CompanyProfile> {
  const { data } = await apiClient.post<Envelope<CompanyProfile>>(
    "/companies",
    input,
  );
  return data.data;
}

export async function updateCompanyProfile({
  id,
  input,
}: {
  id: string;
  input: CompanyProfileInput;
}): Promise<CompanyProfile> {
  const { data } = await apiClient.put<Envelope<CompanyProfile>>(
    `/companies/${id}`,
    input,
  );
  return data.data;
}
