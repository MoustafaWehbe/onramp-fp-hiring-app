import type { Job } from "../types/jobs";

export const stackFilters = [
  "All stacks",
  "React",
  "TypeScript",
  "Go",
  "Python",
  "Figma",
  "AWS",
  "Node.js",
  "Swift",
] as const;

export const mockJobs: Job[] = [
  {
    id: "senior-frontend-engineer",
    company: "Hireflow",
    title: "Senior Frontend Engineer",
    status: "open",
    location: "San Francisco, CA",
    workMode: "Remote OK",
    skills: ["React", "TypeScript", "Tailwind", "Next.js"],
    salary: "$160k - $200k",
    postedAt: "2 days ago",
    category: "Engineering",
    summary:
      "Build polished candidate and recruiter workflows for small teams that care about respectful hiring.",
    responsibilities: [
      "Own candidate-facing product surfaces from discovery through delivery.",
      "Partner with design to ship accessible, responsive interfaces.",
      "Improve frontend patterns, performance, and component quality.",
    ],
    qualifications: [
      "Strong React and TypeScript experience.",
      "Comfort with design systems and product iteration.",
      "A bias for clear writing and maintainable UI code.",
    ],
  },
  {
    id: "backend-engineer-platform",
    company: "Hireflow",
    title: "Backend Engineer, Platform",
    status: "open",
    location: "Remote",
    workMode: "Remote OK",
    skills: ["Go", "Postgres", "Kafka", "AWS"],
    salary: "$170k - $210k",
    postedAt: "3 days ago",
    category: "Engineering",
    summary:
      "Scale the data and workflow services behind a fast, human hiring platform.",
    responsibilities: [
      "Design reliable APIs for jobs, applications, and hiring teams.",
      "Own service health, observability, and data integrity.",
      "Collaborate with product engineers on clean backend contracts.",
    ],
    qualifications: [
      "Production experience with distributed systems.",
      "Deep comfort with relational data modeling.",
      "Pragmatic approach to platform reliability.",
    ],
  },
  {
    id: "product-designer",
    company: "Lumen Labs",
    title: "Product Designer",
    status: "open",
    location: "New York, NY",
    workMode: "Hybrid",
    skills: ["Figma", "Prototyping", "Design Systems"],
    salary: "$140k - $175k",
    postedAt: "4 days ago",
    category: "Design",
    summary:
      "Shape thoughtful workflows for technical teams hiring across product and engineering roles.",
    responsibilities: [
      "Lead discovery and interaction design for hiring workflows.",
      "Create prototypes that clarify complex product decisions.",
      "Evolve a practical design system with engineering partners.",
    ],
    qualifications: [
      "Strong systems thinking and product judgment.",
      "Experience designing SaaS workflows.",
      "Excellent visual craft and communication.",
    ],
  },
  {
    id: "api-developer-advocate",
    company: "Verge",
    title: "API Developer Advocate",
    status: "open",
    location: "Remote - EMEA",
    workMode: "Remote OK",
    skills: ["Node.js", "Writing", "Public Speaking"],
    salary: "$130k - $160k",
    postedAt: "5 days ago",
    category: "Developer Relations",
    summary:
      "Help builders understand, trust, and ship with a modern hiring automation API.",
    responsibilities: [
      "Write docs, guides, and launch content for API users.",
      "Create examples that make integration paths obvious.",
      "Bring developer feedback into product planning.",
    ],
    qualifications: [
      "Hands-on API integration experience.",
      "Clear technical writing and presentation skills.",
      "Empathy for developers learning a new platform.",
    ],
  },
  {
    id: "devops-engineer",
    company: "Northwind",
    title: "DevOps Engineer",
    status: "open",
    location: "Austin, TX",
    workMode: "Remote OK",
    skills: ["Kubernetes", "Terraform", "AWS", "Python"],
    salary: "$150k - $185k",
    postedAt: "6 days ago",
    category: "Infrastructure",
    summary:
      "Keep infrastructure calm, observable, and easy for product teams to ship against.",
    responsibilities: [
      "Maintain cloud infrastructure and deployment pipelines.",
      "Improve monitoring, incident response, and cost visibility.",
      "Automate routine platform operations.",
    ],
    qualifications: [
      "Experience with AWS and infrastructure as code.",
      "Comfort supporting production Kubernetes workloads.",
      "Strong scripting habits and operational judgment.",
    ],
  },
  {
    id: "ml-engineer-ranking",
    company: "Hireflow",
    title: "ML Engineer, Ranking",
    status: "open",
    location: "Remote",
    workMode: "Remote OK",
    skills: ["Python", "PyTorch", "Ray"],
    salary: "$180k - $220k",
    postedAt: "1 week ago",
    category: "Machine Learning",
    summary:
      "Design ranking systems that help candidates find relevant roles without noisy matching.",
    responsibilities: [
      "Build and evaluate ranking models for role recommendations.",
      "Create feedback loops with product and data teams.",
      "Ship model improvements with measurable product impact.",
    ],
    qualifications: [
      "Applied ML experience in ranking or recommendations.",
      "Strong Python and experimentation skills.",
      "Care for fairness, transparency, and product quality.",
    ],
  },
  {
    id: "customer-success-lead",
    company: "Folio",
    title: "Customer Success Lead",
    status: "open",
    location: "London, UK",
    workMode: "Hybrid",
    skills: ["SaaS", "Onboarding", "Analytics"],
    salary: "£70k - £90k",
    postedAt: "1 week ago",
    category: "Customer Success",
    summary:
      "Lead onboarding and customer health for teams adopting a sharper hiring workflow.",
    responsibilities: [
      "Own onboarding plans for high-value customers.",
      "Track adoption signals and guide teams toward better hiring habits.",
      "Partner with product on customer insights and retention opportunities.",
    ],
    qualifications: [
      "Experience supporting B2B SaaS customers.",
      "Strong project management and communication habits.",
      "Comfort turning customer data into action.",
    ],
  },
];

export function getJobById(id: string | undefined): Job | undefined {
  return mockJobs.find((job) => job.id === id);
}
