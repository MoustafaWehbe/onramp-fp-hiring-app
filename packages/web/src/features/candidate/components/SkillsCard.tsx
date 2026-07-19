import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { useSetSkills, useSkillCatalog, useSkills } from "../hooks";
import { CARD_CLASS } from "../theme";

interface SkillsCardProps {
  profileExists: boolean;
}

export function SkillsCard({ profileExists }: SkillsCardProps) {
  const skillsQuery = useSkills(profileExists);
  const [isEditing, setIsEditing] = useState(false);
  const catalogQuery = useSkillCatalog(profileExists && isEditing);
  const setSkills = useSetSkills();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!profileExists) {
      setIsEditing(false);
    }
  }, [profileExists]);

  function startEditing() {
    setSelectedIds(new Set((skillsQuery.data ?? []).map((skill) => skill.id)));
    setFilter("");
    setIsEditing(true);
  }

  function toggleSkill(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    try {
      await setSkills.mutateAsync([...selectedIds]);
      toast.success("Skills updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update your skills."));
    }
  }

  const filteredCatalog = useMemo(() => {
    const skills = catalogQuery.data ?? [];
    const query = filter.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((skill) => skill.name.toLowerCase().includes(query));
  }, [catalogQuery.data, filter]);

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Skills
        </CardTitle>
        {profileExists && !isEditing && (
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Edit skills
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!profileExists && (
          <p className="text-sm text-muted-foreground">
            Set up your profile above to start adding skills.
          </p>
        )}

        {profileExists && !isEditing && skillsQuery.isLoading && (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        )}

        {profileExists && !isEditing && skillsQuery.isError && (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(skillsQuery.error, "Couldn't load your skills.")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void skillsQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {profileExists && !isEditing && skillsQuery.data && (
          <div className="flex flex-wrap gap-2">
            {skillsQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            ) : (
              skillsQuery.data.map((skill) => (
                <Badge key={skill.id} variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                  {skill.name}
                </Badge>
              ))
            )}
          </div>
        )}

        {isEditing && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="skill-filter">Search skills</Label>
              <Input
                id="skill-filter"
                placeholder="Type to filter..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>

            {catalogQuery.isLoading && (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            )}

            {catalogQuery.isError && (
              <div className="space-y-3">
                <p className="text-sm text-destructive" role="alert">
                  {getApiErrorMessage(catalogQuery.error, "Couldn't load the skill list.")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void catalogQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            )}

            {catalogQuery.data && (
              <div
                role="group"
                aria-label="Available skills"
                className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-md border p-3"
              >
                {filteredCatalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills match "{filter}".</p>
                ) : (
                  filteredCatalog.map((skill) => {
                    const selected = selectedIds.has(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSkill(skill.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                          selected
                            ? "border-transparent bg-indigo-600 text-white hover:bg-indigo-700"
                            : "border-input bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        {selected ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5 opacity-0" aria-hidden="true" />
                        )}
                        {skill.name}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {selectedIds.size} skill{selectedIds.size === 1 ? "" : "s"} selected
            </p>

            <div className="flex gap-2">
              <Button type="button" onClick={() => void handleSave()} disabled={setSkills.isPending}>
                {setSkills.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={setSkills.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
