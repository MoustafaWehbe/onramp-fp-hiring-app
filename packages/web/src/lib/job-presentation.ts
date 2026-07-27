import type {
  EmploymentType,
  JobSummary,
  PublicJobRecord,
} from "../types/jobs";
import { formatDate } from "./utils";

export const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
};

export function formatSalaryRange({
  salaryMin,
  salaryMax,
  salaryCurrency,
}: Pick<
  PublicJobRecord,
  "salaryMin" | "salaryMax" | "salaryCurrency"
>): string {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salaryCurrency,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(salaryMin)} – ${formatter.format(salaryMax)}`;
  } catch {
    return `${salaryCurrency} ${salaryMin.toLocaleString()} – ${salaryMax.toLocaleString()}`;
  }
}

export function toJobSummary(job: PublicJobRecord): JobSummary {
  return {
    id: job.id,
    company: job.company.name,
    title: job.title,
    status: "open",
    location: job.location,
    employmentType: job.employmentType,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    isRemote: job.isRemote,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    skills: job.skills.map((skill) => skill.name),
    postedAt: formatDate(job.createdAt),
  };
}
