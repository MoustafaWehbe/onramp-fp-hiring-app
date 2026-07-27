import { apiClient } from "../../lib/api-client";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "../../types/company";

interface Envelope<T> {
  data: T;
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
