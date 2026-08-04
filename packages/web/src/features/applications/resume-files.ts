export const MAX_APPLICATION_RESUME_BYTES = 5 * 1024 * 1024;
export const APPLICATION_RESUME_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function validateApplicationResume(file: File): string | null {
  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLowerCase();
  const expectedMime = MIME_BY_EXTENSION[extension];

  if (!expectedMime || (file.type && file.type !== expectedMime)) {
    return "Choose a PDF or DOCX file.";
  }

  if (file.size > MAX_APPLICATION_RESUME_BYTES) {
    return "CV must be 5MB or smaller.";
  }

  return null;
}
