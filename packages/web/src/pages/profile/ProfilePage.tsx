import { Mail, MapPin, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

const skills = [
  "React",
  "TypeScript",
  "Design Systems",
  "Accessibility",
  "Product Strategy",
];

export function ProfilePage() {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-950 text-2xl font-semibold text-white">
              AU
            </div>
            <h1 className="mt-5 text-2xl font-bold">Admin User</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Senior product engineer
            </p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                admin@example.com
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Remote, US time zones
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Candidate profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="leading-7 text-muted-foreground">
                Focused on building crisp product workflows with reliable
                frontend architecture, accessible components, and clear product
                writing.
              </p>
              <div>
                <p className="mb-3 text-sm font-medium">Core skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
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
              <CardTitle className="text-xl">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                ["Role type", "Frontend, full-stack"],
                ["Company stage", "Seed to Series B"],
                ["Work mode", "Remote-first"],
              ].map(([label, value]) => (
                <div key={label} className="border-l pl-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-emerald-50 text-emerald-700">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">Profile strength is high</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your preferred stack and role scope are clear for recruiters.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
