import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { ProfileSection, SectionAction } from "./ProfileSection";
import { Timeline, TimelineItem } from "./Timeline";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { getApiErrorMessage, getApiFieldErrors } from "../../../lib/api-errors";
import { formatDateOnly } from "../date-utils";
import {
  useCreateEducation,
  useDeleteEducation,
  useEducation,
  useUpdateEducation,
} from "../hooks";
import type { EducationRecord } from "../../../types/candidate";
import { cn } from "../../../lib/utils"
import { TEXT_SUBTLE } from "../theme";
const educationFormSchema = z
  .object({
    institution: z.string().min(1, "Institution is required").max(255),
    degree: z.string().max(255),
    fieldOfStudy: z.string().max(255),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string(),
  })
  .refine(
    (values) => !values.endDate || values.endDate >= values.startDate,
    { message: "End date must be after the start date", path: ["endDate"] },
  );

type EducationFormValues = z.infer<typeof educationFormSchema>;

const FIELD_NAMES = [
  "institution",
  "degree",
  "fieldOfStudy",
  "startDate",
  "endDate",
] as const;

function toFormValues(education?: EducationRecord): EducationFormValues {
  return {
    institution: education?.institution ?? "",
    degree: education?.degree ?? "",
    fieldOfStudy: education?.fieldOfStudy ?? "",
    startDate: education?.startDate ?? "",
    endDate: education?.endDate ?? "",
  };
}

function EducationForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: EducationRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const createEducation = useCreateEducation();
  const updateEducation = useUpdateEducation();
  const isSaving = createEducation.isPending || updateEducation.isPending;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: toFormValues(initial),
  });

  function onError(error: unknown, fallback: string): void {
    // Server-side field errors land on the matching input; anything else is a
    // toast, matching how the work-history form reports failures.
    const fieldErrors = getApiFieldErrors(error);
    let matched = false;

    for (const fieldError of fieldErrors) {
      const field = FIELD_NAMES.find((name) => name === fieldError.field);

      if (field) {
        setError(field, { message: fieldError.message });
        matched = true;
      }
    }

    if (!matched) {
      toast.error(getApiErrorMessage(error, fallback));
    }
  }

  const submit = handleSubmit((values) => {
    // Optional text fields go back as null, not "", so a cleared field reads
    // as absent rather than as an empty string.
    const payload = {
      institution: values.institution,
      degree: values.degree.trim() || null,
      fieldOfStudy: values.fieldOfStudy.trim() || null,
      startDate: values.startDate,
      endDate: values.endDate || null,
    };

    if (initial) {
      updateEducation.mutate(
        { id: initial.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Education updated.");
            onSaved();
          },
          onError: (error) => onError(error, "Couldn't update this entry."),
        },
      );
      return;
    }

    createEducation.mutate(payload, {
      onSuccess: () => {
        toast.success("Education added.");
        onSaved();
      },
      onError: (error) => onError(error, "Couldn't add this entry."),
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="education-institution">Institution</Label>
          <Input id="education-institution" {...register("institution")} />
          {errors.institution && (
            <p className="text-sm text-destructive">
              {errors.institution.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-degree">Degree</Label>
          <Input
            id="education-degree"
            placeholder="BSc"
            {...register("degree")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-field">Field of study</Label>
          <Input
            id="education-field"
            placeholder="Computer Science"
            {...register("fieldOfStudy")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-start">Start date</Label>
          <Input id="education-start" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-sm text-destructive">
              {errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-end">End date</Label>
          <Input id="education-end" type="date" {...register("endDate")} />
          <p className="text-xs text-muted-foreground">
            Leave empty if you're still studying.
          </p>
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving…" : initial ? "Save changes" : "Add education"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function EducationCard({ hasProfile }: { hasProfile: boolean }) {
  const educationQuery = useEducation(hasProfile);
  const deleteEducation = useDeleteEducation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const entries = educationQuery.data ?? [];

  function remove(entry: EducationRecord): void {
    deleteEducation.mutate(entry.id, {
      onSuccess: () => toast.success("Education removed."),
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't remove this entry.")),
    });
  }

  return (
    <ProfileSection
      icon={GraduationCap}
      title="Education"
      action={
        hasProfile && !isAdding ? (
          <SectionAction
            label="Add education"
            variant="add"
            onClick={() => {
              setEditingId(null);
              setIsAdding(true);
            }}
          />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {!hasProfile && (
          <p className="text-sm text-muted-foreground">
            Create your profile to add education.
          </p>
        )}

        {hasProfile && educationQuery.isLoading && (
          <div className="space-y-3" aria-label="Loading education">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
        )}

        {isAdding && (
          <EducationForm
            onCancel={() => setIsAdding(false)}
            onSaved={() => setIsAdding(false)}
          />
        )}

        {hasProfile &&
          !educationQuery.isLoading &&
          entries.length === 0 &&
          !isAdding && (
            <p className="text-sm text-muted-foreground">No education added yet.</p>
          )}

        {entries.length > 0 && (
          <Timeline>
            {entries.map((entry, index) =>
              editingId === entry.id ? (
                <li key={entry.id} className="pb-6 last:pb-0">
                  <EducationForm
                    initial={entry}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <TimelineItem
                  key={entry.id}
                  isLast={index === entries.length - 1}
                  // Still studying reads as the in-progress marker, matching
                  // how a current role is shown in Experience.
                  tone={entry.endDate ? "accent" : "current"}
                  icon={
                    <GraduationCap
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  }
                  title={entry.institution}
                  subtitle={
                    [entry.degree, entry.fieldOfStudy]
                      .filter(Boolean)
                      .join(" · ") || "Studies"
                  }
                  meta={`${formatDateOnly(entry.startDate)} – ${
                    entry.endDate ? formatDateOnly(entry.endDate) : "Present"
                  }`}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-400"
                        aria-label={`Edit ${entry.institution}`}
                        onClick={() => {
                          setIsAdding(false);
                          setEditingId(entry.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 hover:text-destructive", TEXT_SUBTLE)}
                        aria-label={`Remove ${entry.institution}`}
                        onClick={() => remove(entry)}
                        disabled={deleteEducation.isPending}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  }
                />
              ),
            )}
          </Timeline>
        )}
      </div>
    </ProfileSection>
  );
}
