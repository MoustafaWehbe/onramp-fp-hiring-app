import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractResumeText } from "../../src/services/application-resume.service";

const fixtures = [
  {
    filename: "full-stack-engineer.pdf",
    contentType: "application/pdf",
    expected: "Senior Full-Stack Engineer",
  },
  {
    filename: "product-designer.pdf",
    contentType: "application/pdf",
    expected: "Staff Product Designer",
  },
  {
    filename: "product-operations.pdf",
    contentType: "application/pdf",
    expected: "Product Operations Lead",
  },
  {
    filename: "data-platform-engineer.docx",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    expected: "Senior Data Platform Engineer",
  },
] as const;

describe("committed demo resume fixtures", () => {
  it.each(fixtures)(
    "keeps $filename valid and text-extractable",
    async ({ filename, contentType, expected }) => {
      const fixturePath = path.resolve(
        process.cwd(),
        "src/seeders/fixtures/resumes",
        filename,
      );
      const body = await readFile(fixturePath);
      const text = await extractResumeText(body, contentType);

      expect(text).toContain(expected);
      expect(text.length).toBeGreaterThan(200);
    },
  );
});
