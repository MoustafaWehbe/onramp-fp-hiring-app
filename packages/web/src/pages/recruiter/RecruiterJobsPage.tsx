import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import {
  Button,
} from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useEffect, useState } from "react";


const applicantCounts: Record<string, number> = {
  "senior-frontend-engineer": 42,
  "backend-engineer-platform": 31,
  "product-designer": 28,
  "api-developer-advocate": 16,
  "devops-engineer": 22,
  "ml-engineer-ranking": 19,
  "customer-success-lead": 13,
};

export function RecruiterJobsPage() {
  type Job = {
  id: string;
  title: string;
  description: string;
  location?: string;
  status: string;
};

const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
  async function fetchJobs() {
    try {
      const response = await fetch(
        "http://localhost:3000/api/jobs",
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      setJobs(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error(error);
    }
  }

  fetchJobs();
}, []);
  return (
    
    <div className="bg-muted/30">
      
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Recruiter jobs</p>
          <h1 className="mt-2 text-4xl font-bold">Jobs you are hiring for.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Monitor active postings and jump straight into candidate review.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground"></p>
                    <CardTitle className="mt-2 text-xl leading-7">
                      {job.title}
                    </CardTitle>
                  </div>
                  <Badge variant={job.status === "OPEN" ? "success" : "muted"}>
                    {job.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {applicantCounts[job.id] ?? 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Applicants</p>
                <Link to={`/recruiter/pipeline/${job.id}`}> View pipeline </Link>
               <div className="mt-4 flex gap-2">

<Link
  to={`/recruiter/jobs/${job.id}`}
  className="flex-1"
>
  <Button variant="outline" className="w-full">
    View Details
  </Button>
</Link>

<Link
  to={`/recruiter/jobs/${job.id}/edit`}
  className="flex-1"
>
  <Button variant="secondary" className="w-full">
    Edit
  </Button>
</Link>

<Button
  variant="destructive"
  className="flex-1"
>
  Delete
</Button>


</div>
    <Link to={`/recruiter/jobs/${job.id}`}> </Link>
    <Link to={`/recruiter/jobs/${job.id}/edit`}> </Link>

              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
