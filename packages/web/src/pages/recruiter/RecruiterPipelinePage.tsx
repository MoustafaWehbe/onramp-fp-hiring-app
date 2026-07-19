import { ArrowRight, Mail } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {Card,CardContent, } from "../../components/ui/card";
import { mockCandidates, pipelineStages } from "../../data/pipeline";
import { useEffect, useState } from "react";
interface Application {
  id: string;
  stage: string;
  candidateProfileId: string;
}
export function RecruiterPipelinePage() {

  const [applications, setApplications] =
    useState<Application[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const response = await fetch(
          "http://localhost:3000/api/applications/job/648dd3a8-2a68-4d16-a734-a59ce8d8b6ee"
        );

        const data = await response.json();

        setApplications(data.data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchApplications();
  }, []);

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Recruiter pipeline</p>
          <h1 className="mt-2 text-4xl font-bold">Review candidates without noise.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            See candidate stage, signal, and next review action at a glance.
          </p>
        </div>

        <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
          {pipelineStages.map((stage) => (
            <div
              key={stage.stage}
              className="min-w-36 rounded-lg border bg-card p-4"
            >
              <p className="text-sm font-medium">{stage.stage}</p>
              <p className="mt-2 text-2xl font-semibold">{stage.count}</p>
            </div>
          ))}
        </div>
<div className="mb-8">
  <h2 className="mb-4 text-2xl font-bold">
    Real Applications
  </h2>

  {applications.map((application) => (
    <div
      key={application.id}
      className="mb-3 rounded border p-4"
    >
      <p>
        <strong>Application ID:</strong>{" "}
        {application.id}
      </p>

      <p>
        <strong>Stage:</strong>{" "}
        {application.stage}
      </p>
<p>
  <strong>Candidate Profile:</strong>{" "}
  {application.candidateProfileId}
</p>
<button
  onClick={async () => {
  try {
    await fetch(
      `http://localhost:3000/api/applications/${application.id}/stage`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: "INTERVIEWING",
        }),
      }
    );

    alert("Stage updated!");
  } catch (error) {
    console.error(error);
  }
}}
  className="mt-2 rounded bg-blue-500 px-3 py-2 text-white"
>
  Move To Interviewing
</button>
<button
  onClick={async () => {
    try {
      await fetch(
        `http://localhost:3000/api/applications/${application.id}/assign-interviewer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interviewerId:
              "340343ce-ca26-4172-bc0f-7047a9a79bc8",
          }),
        }
      );

      alert("Interviewer assigned!");
    } catch (error) {
      console.error(error);
    }
  }}
  className="ml-2 rounded bg-green-600 px-3 py-2 text-white"
>
  Assign Interviewer
</button>
</div>
))}

</div>

<div className="grid gap-4">
  {mockCandidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_180px_160px] lg:items-center">
                <div>
                  <h2 className="text-lg font-semibold">{candidate.name}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {candidate.email}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {candidate.role} · {candidate.source}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:block lg:space-y-2">
                  <Badge variant="secondary">{candidate.stage}</Badge>
                  <Badge
                    variant={
                      candidate.feedbackStatus === "Pending"
                        ? "success"
                        : "outline"
                    }
                  >
                    {candidate.feedbackStatus}
                  </Badge>
                </div>
                <Button className="gap-2">
                  Quick review
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
