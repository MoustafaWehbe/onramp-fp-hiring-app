import { FileText, Mail, MapPin, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { candidateProfile } from "../../data/users";

export function ProfilePage() {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-950 text-2xl font-semibold text-white">
              AS
            </div>
            <h1 className="mt-5 text-2xl font-bold">{candidateProfile.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidateProfile.headline}
            </p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {candidateProfile.email}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {candidateProfile.location}
              </p>
              <p className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                CV profile ready
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Resume summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="leading-7 text-muted-foreground">
                {candidateProfile.summary}
              </p>
              <div>
                <p className="mb-3 text-sm font-medium">Core skills</p>
                <div className="flex flex-wrap gap-2">
                  {candidateProfile.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {candidateProfile.experience.map((item) => (
                <div key={`${item.company}-${item.title}`} className="border-l pl-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {item.company}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.period}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-emerald-50 text-emerald-700">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold">Profile completion is strong</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {candidateProfile.completion}% complete. Add portfolio links
                  later when backend profile editing is connected.
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-10/12 rounded-full bg-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
