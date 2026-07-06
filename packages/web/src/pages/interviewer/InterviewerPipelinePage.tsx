import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { mockCandidates } from "../../data/pipeline";

export function InterviewerPipelinePage() {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Assigned pipeline</p>
          <h1 className="mt-2 text-4xl font-bold">Candidates assigned to you.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Focus on interview stage and feedback status for your assigned
            candidates.
          </p>
        </div>

        <div className="grid gap-4">
          {mockCandidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center">
                <div>
                  <h2 className="text-lg font-semibold">{candidate.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {candidate.role}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:block md:space-y-2">
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
                <Button variant="outline">Open notes</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
