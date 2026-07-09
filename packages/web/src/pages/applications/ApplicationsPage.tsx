import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { mockApplications } from "../../data/applications";

const applicationIcons = [Clock3, CalendarDays, CheckCircle2];

export function ApplicationsPage() {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">My applications</p>
          <h1 className="mt-2 text-4xl font-bold">Track every conversation.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A calm overview of saved roles, active interviews, and next steps.
          </p>
        </div>

        <div className="grid gap-4">
          {mockApplications.map((application, index) => {
            const Icon = applicationIcons[index] ?? Clock3;

            return (
              <Card key={application.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-card text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {application.company}
                      </p>
                      <h2 className="text-lg font-semibold">
                        {application.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {application.stage} - {application.updatedAt}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{application.status}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">Application health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {[
              [String(mockApplications.length), "Active applications"],
              ["2", "Interviews scheduled"],
              ["6 days", "Average response time"],
            ].map(([value, label]) => (
              <div key={label} className="border-l pl-4">
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
