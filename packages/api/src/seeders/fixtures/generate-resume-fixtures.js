"use strict";

/**
 * Rebuilds the small, fictional resume fixtures committed beside this file.
 * No network access or personal data is used. Run from packages/api with:
 *   node src/seeders/fixtures/generate-resume-fixtures.js
 */

const path = require("path");
const { promises: fs } = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const JSZip = require("jszip");

const OUTPUT_DIR = path.resolve(__dirname, "resumes");

const PDF_FIXTURES = [
  {
    filename: "full-stack-engineer.pdf",
    name: "Amara Okafor",
    title:
      "Senior Full-Stack Engineer | React, Node.js, PostgreSQL | Remote-first teams",
    contact: "Lagos, Nigeria | amara.okafor@example.com",
    summary:
      "I lead full-stack delivery from schema design through accessible interfaces, with a focus on dependable systems and pragmatic mentoring. Most recently at Blue Harbor Software, I led a cross-functional product squad and reduced release lead time while scaling a high-traffic customer workflow.",
    experience: [
      "Senior Software Engineer - Blue Harbor Software - January 2021 to Present",
      "Led a cross-functional product squad and reduced release lead time while scaling a high-traffic customer workflow.",
      "Full-Stack Engineer - NimbusCart - May 2017 to January 2021",
      "Delivered customer-facing improvements, strengthened team practices, and took ownership of increasingly complex work.",
    ],
    skills: "React, TypeScript, Node.js, PostgreSQL, GraphQL, AWS",
    education:
      "BSc Computer Science - University of Lagos - September 2012 to June 2016; Professional Certificate in Leadership and Systems Design - Open Learning Institute - February 2024 to October 2024",
    color: rgb(0.18, 0.22, 0.56),
  },
  {
    filename: "product-designer.pdf",
    name: "Sofia Marino",
    title: "Staff Product Designer",
    contact: "Milan, Italy | sofia.marino@example.com",
    summary:
      "Product designer focused on complex B2B workflows, inclusive research, and scalable design systems.",
    experience: [
      "Senior Product Designer - Copperline Studio - 2020 to Present",
      "Led discovery and interaction design for an operations platform used by distributed service teams.",
      "UX Designer - Paperplane Products - 2016 to 2020",
      "Created a shared component library and improved onboarding completion through iterative research.",
    ],
    skills: "Figma, User Research, Product Strategy, Accessibility, Content Design",
    education: "MA Human-Computer Interaction - Politecnico di Milano",
    color: rgb(0.55, 0.16, 0.42),
  },
  {
    filename: "product-operations.pdf",
    name: "Kofi Mensah",
    title: "Product Operations Lead",
    contact: "Accra, Ghana | kofi.mensah@example.com",
    summary:
      "Operations leader who turns customer and marketplace complexity into measurable, repeatable systems.",
    experience: [
      "Marketplace Operations Lead - Kindred Market - 2021 to Present",
      "Improved service-level performance and redesigned escalation paths across a growing partner network.",
      "Operations Analyst - Northstar Logistics - 2017 to 2021",
      "Built reporting, capacity planning, and customer feedback processes for regional delivery teams.",
    ],
    skills: "Data Analysis, SQL, Tableau, Customer Success, Product Strategy",
    education: "BBA Operations Management - University of Ghana",
    color: rgb(0.08, 0.42, 0.35),
  },
];

function wrapText(text, maxLength = 88) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createPdf(fixture) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let y = 742;

  page.drawRectangle({ x: 0, y: 720, width: 612, height: 72, color: fixture.color });
  page.drawText(fixture.name, { x: 42, y: 754, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(fixture.title, { x: 42, y: 734, size: 11, font: regular, color: rgb(0.95, 0.96, 1) });
  y = 695;

  const section = (title, lines) => {
    page.drawText(title.toUpperCase(), { x: 42, y, size: 10, font: bold, color: fixture.color });
    y -= 18;
    for (const line of lines.flatMap((value) => wrapText(value))) {
      page.drawText(line, { x: 42, y, size: 10, font: regular, color: rgb(0.13, 0.15, 0.2) });
      y -= 15;
    }
    y -= 10;
  };

  page.drawText(fixture.contact, { x: 42, y, size: 9, font: regular, color: rgb(0.35, 0.37, 0.42) });
  y -= 28;
  section("Profile", [fixture.summary]);
  section("Experience", fixture.experience);
  section("Skills", [fixture.skills]);
  section("Education", [fixture.education]);

  const bytes = await document.save();
  await fs.writeFile(path.join(OUTPUT_DIR, fixture.filename), bytes);
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function createDocx() {
  const archive = new JSZip();
  const paragraphs = [
    "Dev Patel",
    "Senior Data Platform Engineer",
    "Pune, India | dev.patel@example.com",
    "Platform engineer with 8 years of professional experience building reliable data infrastructure.",
    "Experience",
    "Senior Platform Engineer - Mosaic Cloud - 2021 to Present",
    "Built Kubernetes and Terraform foundations for more than forty services and improved incident recovery.",
    "Data Engineer - Sundial Data - 2018 to 2021",
    "Developed Python, Airflow, PostgreSQL, and Kafka pipelines with tested data contracts.",
    "Skills",
    "Python, SQL, PostgreSQL, Airflow, Kafka, Docker, Kubernetes, Terraform, AWS",
    "Education",
    "BEng Software Engineering - Indian Institute of Technology Delhi",
  ];

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
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs
      .map(
        (paragraph) =>
          `<w:p><w:r><w:t>${xmlEscape(paragraph)}</w:t></w:r></w:p>`,
      )
      .join("")}<w:sectPr/></w:body></w:document>`,
  );

  const buffer = await archive.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(path.join(OUTPUT_DIR, "data-platform-engineer.docx"), buffer);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(PDF_FIXTURES.map(createPdf));
  await createDocx();
  console.info(`Generated ${PDF_FIXTURES.length + 1} fictional resume fixtures in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
