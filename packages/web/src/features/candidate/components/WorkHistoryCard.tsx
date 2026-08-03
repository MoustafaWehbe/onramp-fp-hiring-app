import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Briefcase, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { ProfileSection, SectionAction } from "./ProfileSection";
import { Timeline, TimelineItem } from "./Timeline";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { Textarea } from "../../../components/ui/textarea";
import { getApiErrorMessage, getApiFieldErrors } from "../../../lib/api-errors";
import { formatDateOnly, todayIsoDate } from "../date-utils";
import {
  useCreateExperience,
  useDeleteExperience,
  useExperience,
  useUpdateExperience,
} from "../hooks";
import type { WorkExperienceRecord } from "../../../types/candidate";

const experienceFormSchema = z.object({
  company: z.string().min(1, "Company is required").max(255),
  title: z.string().min(1, "Title is required").max(255),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string(),
  description: z.string(),
});

type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

function toFormValues(experience?: WorkExperienceRecord): ExperienceFormValues {
  return {
    company: experience?.company ?? "",
    title: experience?.title ?? "",
    startDate: experience?.startDate ?? "",
    endDate: experience?.endDate ?? "",
    description: experience?.description ?? "",
  };
}

const FIELD_NAMES = ["company", "title", "startDate", "endDate", "description"] as const;

interface ExperienceFormProps {
  initial?: WorkExperienceRecord;
  onCancel: () => void;
  onSaved: () => void;
}

function ExperienceForm({ initial, onCancel, onSaved }: ExperienceFormProps) {
  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();
  const isSaving = createExperience.isPending || updateExperience.isPending;

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceFormSchema),
    defaultValues: toFormValues(initial),
  });

  const [currentRole, setCurrentRole] = useState(!initial?.endDate);

  async function onSubmit(values: ExperienceFormValues) {
    const payload = {
      company: values.company,
      title: values.title,
      startDate: values.startDate,
      endDate: currentRole ? undefined : values.endDate || undefined,
      description: values.description || undefined,
    };

    try {
      if (initial) {
        await updateExperience.mutateAsync({ id: initial.id, input: payload });
        toast.success("Work experience updated");
      } else {
        await createExperience.mutateAsync(payload);
        toast.success("Work experience added");
      }
      onSaved();
    } catch (error) {
      for (const fieldError of getApiFieldErrors(error)) {
        if ((FIELD_NAMES as readonly string[]).includes(fieldError.field)) {
          form.setError(fieldError.field as (typeof FIELD_NAMES)[number], {
            message: fieldError.message,
          });
        }
      }
      toast.error(getApiErrorMessage(error, "Couldn't save this work experience."));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exp-company">Company</Label>
          <Input id="exp-company" placeholder="Acme Inc." {...form.register("company")} />
          {form.formState.errors.company && (
            <p className="text-xs text-destructive">{form.formState.errors.company.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-title">Title</Label>
          <Input id="exp-title" placeholder="Senior Engineer" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-startDate">Start date</Label>
          <Input
            id="exp-startDate"
            type="date"
            max={todayIsoDate()}
            {...form.register("startDate")}
          />
          {form.formState.errors.startDate && (
            <p className="text-xs text-destructive">
              {form.formState.errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-endDate">End date</Label>
          <Input
            id="exp-endDate"
            type="date"
            max={todayIsoDate()}
            disabled={currentRole}
            {...form.register("endDate")}
          />
          {form.formState.errors.endDate && (
            <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-indigo-600"
              checked={currentRole}
              onChange={(event) => {
                setCurrentRole(event.target.checked);
                if (event.target.checked) {
                  form.setValue("endDate", "");
                }
              }}
            />
            This is my current role
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="exp-description">Description</Label>
        <Textarea id="exp-description" rows={3} {...form.register("description")} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface WorkHistoryCardProps {
  profileExists: boolean;
}

export function WorkHistoryCard({ profileExists }: WorkHistoryCardProps) {
  const experienceQuery = useExperience(profileExists);
  const deleteExperience = useDeleteExperience();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profileExists) {
      setAddingNew(false);
      setEditingId(null);
    }
  }, [profileExists]);

  async function handleDelete(experience: WorkExperienceRecord) {
    if (!window.confirm(`Remove ${experience.title} at ${experience.company}?`)) {
      return;
    }

    try {
      await deleteExperience.mutateAsync(experience.id);
      toast.success("Work experience removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove this work experience."));
    }
  }

  const experiences = experienceQuery.data ?? [];

  return (
    <ProfileSection
      icon={Briefcase}
      title="Experience"
      action={
        profileExists && !addingNew ? (
          <SectionAction
            label="Add experience"
            variant="add"
            onClick={() => setAddingNew(true)}
          />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {!profileExists && (
          <p className="text-sm text-stone-500">
            Set up your profile above to start adding work experience.
          </p>
        )}

        {profileExists && experienceQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {profileExists && experienceQuery.isError && (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(experienceQuery.error, "Couldn't load your work history.")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void experienceQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {addingNew && (
          <ExperienceForm
            onCancel={() => setAddingNew(false)}
            onSaved={() => setAddingNew(false)}
          />
        )}

        {profileExists && experiences.length === 0 && !addingNew && (
          <p className="text-sm text-stone-500">
            No work experience added yet.
          </p>
        )}

        {profileExists && experiences.length > 0 && (
          <Timeline>
            {experiences.map((experience, index) =>
              editingId === experience.id ? (
                <li key={experience.id} className="pb-6 last:pb-0">
                  <ExperienceForm
                    initial={experience}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <TimelineItem
                  key={experience.id}
                  isLast={index === experiences.length - 1}
                  // No end date means this is the role still running.
                  tone={experience.endDate ? "accent" : "current"}
                  icon={
                    <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                  }
                  title={experience.title}
                  subtitle={experience.company}
                  meta={`${formatDateOnly(experience.startDate)} – ${
                    experience.endDate
                      ? formatDateOnly(experience.endDate)
                      : "Present"
                  }`}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-stone-400 hover:text-indigo-600"
                        aria-label={`Edit ${experience.title} at ${experience.company}`}
                        onClick={() => setEditingId(experience.id)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-stone-400 hover:text-destructive"
                        aria-label={`Remove ${experience.title} at ${experience.company}`}
                        onClick={() => void handleDelete(experience)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  }
                >
                  {experience.description && (
                    <p className="whitespace-pre-line">
                      {experience.description}
                    </p>
                  )}
                </TimelineItem>
              ),
            )}
          </Timeline>
        )}
      </div>
    </ProfileSection>
  );
}
