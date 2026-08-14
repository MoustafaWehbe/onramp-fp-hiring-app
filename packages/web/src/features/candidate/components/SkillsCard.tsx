import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { SkillsInput } from "../../../components/skills/SkillsInput";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { ProfileSection, SectionAction } from "./ProfileSection";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { getApiErrorMessage } from "../../../lib/api-errors";
import type { SkillOption } from "../../../types/skills";
import { useSetSkills, useSkills } from "../hooks";
import { ACCENT_CHIP } from "../theme";
interface SkillsCardProps {
  profileExists: boolean;
}
export function SkillsCard({ profileExists }: SkillsCardProps) {
  const skillsQuery = useSkills(profileExists);
  const [isEditing, setIsEditing] = useState(false);
  const setSkills = useSetSkills();
  const [selectedSkills, setSelectedSkills] = useState<SkillOption[]>([]);

  useEffect(() => {
    if (!profileExists) {
      setIsEditing(false);
    }
  }, [profileExists]);

  function startEditing() {
    setSelectedSkills(skillsQuery.data ?? []);
    setIsEditing(true);
  }

  async function handleSave() {
    try {
      await setSkills.mutateAsync(selectedSkills.map((skill) => skill.id));
      toast.success("Skills updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update your skills."));
    }
  }

  return (
    <ProfileSection
      icon={Sparkles}
      title="Skills"
      action={
        profileExists && !isEditing ? (
          <SectionAction label="Edit skills" onClick={startEditing} />
        ) : undefined
      }
    >
      <div className="space-y-4">
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
              // Pills that wrap, sized for scanning rather than reading.
              skillsQuery.data.map((skill) => (
                <Badge
                  key={skill.id}
                  variant="outline"
                  className={cn("rounded-full px-3 py-1 text-sm", ACCENT_CHIP)}
                >
                  {skill.name}
                </Badge>
              ))
            )}
          </div>
        )}

        {isEditing && (
          <div className="space-y-3">
            <SkillsInput
              id="candidate-skills-input"
              value={selectedSkills}
              onChange={setSelectedSkills}
              maxSkills={50}
              disabled={setSkills.isPending}
            />

            <p className="text-xs text-muted-foreground">
              {selectedSkills.length} skill{selectedSkills.length === 1 ? "" : "s"} selected
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
      </div>
    </ProfileSection>
  );
}
