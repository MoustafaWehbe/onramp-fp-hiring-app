import { Badge } from "../../components/ui/badge";
import {Card,CardContent, } from "../../components/ui/card";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { pipelineStages }
from "../../data/pipeline";
interface Application {
  id: string;
  stage: string;
  candidateProfileId: string;
}
export function RecruiterPipelinePage() {
const { id } = useParams();
  const [applications, setApplications] =
    useState<Application[]>([]);
useEffect(() => {
  async function fetchApplications() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/applications/job/${id}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      setApplications(
        Array.isArray(data.data)
          ? data.data
          : [],
      );
    } catch (error) {
      console.error(error);
    }
  }

  fetchApplications();
}, [id]);

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

 {applications?.map((application) => (
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
  {applications.map((application) => (
    <Card key={application.id}>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold">
          Application {application.id}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Candidate Profile:
          {" "}
          {application.candidateProfileId}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">
            {application.stage}
          </Badge>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={async () => {
              try {
                await fetch(
                  `http://localhost:3000/api/applications/${application.id}/stage`,
                  {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      stage: "INTERVIEWING",
                    }),
                  },
                );

                alert("Stage updated!");
              } catch (error) {
                console.error(error);
              }
            }}
            className="rounded bg-blue-500 px-3 py-2 text-white"
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
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      interviewerId:
                        "340343ce-ca26-4172-bc0f-7047a9a79bc8",
                    }),
                  },
                );

                alert("Interviewer assigned!");
              } catch (error) {
                console.error(error);
              }
            }}
            className="rounded bg-green-600 px-3 py-2 text-white"
          >
            Assign Interviewer
          </button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
      </section>
    </div>
  );
}
