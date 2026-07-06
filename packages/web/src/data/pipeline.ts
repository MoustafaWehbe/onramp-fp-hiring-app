import type { CandidateLead, PipelineStageSummary } from "../types/pipeline";

export const pipelineStages: PipelineStageSummary[] = [
  { stage: "Applied", count: 42 },
  { stage: "Screen", count: 18 },
  { stage: "Technical", count: 9 },
  { stage: "Final", count: 4 },
  { stage: "Offer", count: 2 },
];

export const mockCandidates: CandidateLead[] = [
  {
    id: "cand-avery",
    name: "Avery Stone",
    email: "avery@example.com",
    role: "Senior Frontend Engineer",
    stage: "Technical",
    fitScore: 92,
    skills: ["React", "TypeScript", "Accessibility"],
    source: "Inbound",
    feedbackStatus: "Pending",
  },
  {
    id: "cand-sam",
    name: "Sam Rivera",
    email: "sam@example.com",
    role: "Backend Engineer, Platform",
    stage: "Screen",
    fitScore: 86,
    skills: ["Go", "Postgres", "AWS"],
    source: "Referral",
    feedbackStatus: "Not started",
  },
  {
    id: "cand-nina",
    name: "Nina Patel",
    email: "nina@example.com",
    role: "Product Designer",
    stage: "Final",
    fitScore: 89,
    skills: ["Figma", "Research", "Systems"],
    source: "Sourced",
    feedbackStatus: "Submitted",
  },
  {
    id: "cand-diego",
    name: "Diego Torres",
    email: "diego@example.com",
    role: "DevOps Engineer",
    stage: "Technical",
    fitScore: 84,
    skills: ["AWS", "Terraform", "Kubernetes"],
    source: "Inbound",
    feedbackStatus: "Pending",
  },
];
