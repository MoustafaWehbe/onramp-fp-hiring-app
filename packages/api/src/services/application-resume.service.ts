import path from "path";
import mammoth from "mammoth";
import DOMMatrix from "@thednp/dommatrix";
import { privateStorageProvider } from "../lib/storage";
import { applicationResumeStorageKey } from "../lib/resume-upload";

const MAX_EXPERIENCE_YEARS = 60;

const SKILL_KEYWORDS = [
  "JavaScript",
  "TypeScript",
  "React Native",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Node.js",
  "Express",
  "NestJS",
  "Python",
  "Django",
  "Flask",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "C++",
  "Go",
  "Rust",
  "PHP",
  "Laravel",
  "Ruby",
  "Rails",
  "Swift",
  "Kotlin",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Kafka",
  "RabbitMQ",
  "Elasticsearch",
  "Git",
  "Linux",
  "CI/CD",
  "Jenkins",
  "Figma",
  "Jira",
  "Scrum",
] as const;

export interface ParsedResumeSignals {
  yearsExperience: number | null;
  skills: string[];
}

export interface StoredApplicationResume extends ParsedResumeSignals {
  storageKey: string;
  originalFilename: string;
  text: string | null;
  uploadedAt: Date;
  parseSucceeded: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordPattern(keyword: string): RegExp {
  const escaped = escapeRegExp(keyword).replace(/\s+/g, "\\s+");
  const startsWithWord = /^\w/.test(keyword);
  const endsWithWord = /\w$/.test(keyword);

  return new RegExp(
    `${startsWithWord ? "\\b" : ""}${escaped}${endsWithWord ? "\\b" : ""}`,
    "i",
  );
}

export function parseYearsExperience(text: string): number | null {
  const patterns = [
    /(?:over|more\s+than|at\s+least)?\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience\b/gi,
    /\bexperience\s*(?:of|:|-)?\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/gi,
  ];
  const matches = patterns.flatMap((pattern) =>
    [...text.matchAll(pattern)]
      .map((match) => Number(match[1]))
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value >= 0 &&
          value <= MAX_EXPERIENCE_YEARS,
      ),
  );

  return matches.length > 0 ? Math.max(...matches) : null;
}

export function parseSkills(text: string): string[] {
  return SKILL_KEYWORDS.filter((skill) => keywordPattern(skill).test(text));
}

export function parseResumeSignals(text: string | null): ParsedResumeSignals {
  if (!text) {
    return { yearsExperience: null, skills: [] };
  }

  return {
    yearsExperience: parseYearsExperience(text),
    skills: parseSkills(text),
  };
}

function normalizeExtractedText(value: string): string {
  return value
    .split("\u0000")
    .join("")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (mimetype === "application/pdf") {
    const runtime = globalThis as unknown as Record<string, unknown>;
    runtime.DOMMatrix ??= DOMMatrix;
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const text = normalizeExtractedText(result.text);

      if (!text) {
        throw new Error("PDF contains no extractable text");
      }

      return text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const text = normalizeExtractedText(result.value);

    if (!text) {
      throw new Error("DOCX contains no extractable text");
    }

    return text;
  }

  throw new Error("Unsupported CV format");
}

function safeOriginalFilename(originalname: string): string {
  const basename = originalname.split(/[\\/]/).pop() ?? "resume";
  const sanitized = [...basename]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("")
    .trim();

  return (sanitized || "resume").slice(0, 255);
}

export function resumeContentType(storageKey: string): string {
  return path.extname(storageKey).toLowerCase() === ".pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export class ApplicationResumeService {
  async storeAndParse(
    userId: string,
    file: Express.Multer.File,
  ): Promise<StoredApplicationResume> {
    const storageKey = applicationResumeStorageKey(userId, file.mimetype);
    const upload = await privateStorageProvider.upload(
      storageKey,
      file.buffer,
      file.mimetype,
    );
    let text: string | null = null;
    let parseSucceeded = true;

    try {
      text = await extractResumeText(file.buffer, file.mimetype);
    } catch {
      parseSucceeded = false;
    }

    const signals = parseResumeSignals(text);

    return {
      storageKey: upload.key,
      originalFilename: safeOriginalFilename(file.originalname),
      text,
      yearsExperience: signals.yearsExperience,
      skills: signals.skills,
      uploadedAt: new Date(),
      parseSucceeded,
    };
  }

  read(storageKey: string): Promise<Buffer> {
    return privateStorageProvider.read(storageKey);
  }

  delete(storageKey: string): Promise<void> {
    return privateStorageProvider.delete(storageKey);
  }
}

export const applicationResumeService = new ApplicationResumeService();
