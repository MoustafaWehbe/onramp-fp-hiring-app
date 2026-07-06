export type JobStatus = "open" | "closed";

export type WorkMode = "Remote OK" | "Hybrid" | "On-site";

export interface Job {
  id: string;
  company: string;
  title: string;
  status: JobStatus;
  location: string;
  workMode: WorkMode;
  skills: string[];
  salary: string;
  postedAt: string;
  category: string;
  summary: string;
  responsibilities: string[];
  qualifications: string[];
}
