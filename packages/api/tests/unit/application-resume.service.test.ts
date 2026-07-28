import JSZip from "jszip";
import {
  extractResumeText,
  parseResumeSignals,
  parseSkills,
  parseYearsExperience,
} from "../../src/services/application-resume.service";

describe("application resume signal parsing", () => {
  it("extracts raw text from a real DOCX archive", async () => {
    const archive = new JSZip();
    archive.file(
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    );
    archive.file(
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    );
    archive.file(
      "word/document.xml",
      '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Platform engineer with 7 years of experience using TypeScript and Docker.</w:t></w:r></w:p></w:body></w:document>',
    );
    const buffer = await archive.generateAsync({ type: "nodebuffer" });

    await expect(
      extractResumeText(
        buffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).resolves.toContain("7 years of experience");
  });

  it("extracts explicit years-of-experience statements", () => {
    expect(
      parseYearsExperience(
        "Senior engineer with more than 8+ years of professional experience.",
      ),
    ).toBe(8);
    expect(parseYearsExperience("Experience: 4.5 yrs building APIs")).toBe(4.5);
  });

  it("leaves years null when the text only contains dates or weak signals", () => {
    expect(
      parseYearsExperience(
        "Software Engineer, 2018-2024. Built systems for several teams.",
      ),
    ).toBeNull();
    expect(
      parseYearsExperience("Worked on React for years across many products."),
    ).toBeNull();
  });

  it("matches a documented keyword list without guessing unrelated words", () => {
    expect(
      parseSkills(
        "Built React and TypeScript services with Node.js, PostgreSQL, Docker, AWS, and CI/CD.",
      ),
    ).toEqual(
      expect.arrayContaining([
        "React",
        "TypeScript",
        "Node.js",
        "PostgreSQL",
        "Docker",
        "AWS",
        "CI/CD",
      ]),
    );
    expect(parseSkills("Strong communication and mentoring skills.")).toEqual(
      [],
    );
  });

  it("returns conservative empty signals when extraction produced no text", () => {
    expect(parseResumeSignals(null)).toEqual({
      yearsExperience: null,
      skills: [],
    });
  });
});
