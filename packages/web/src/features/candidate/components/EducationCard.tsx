import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
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
import { CARD_CLASS } from "../theme";
import type { EducationRecord } from "../../../types/candidate";

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
    <Card className={CARD_CLASS}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-xl">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
          Education
        </CardTitle>
        {hasProfile && !isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditingId(null);
              setIsAdding(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground">
              No education added yet.
            </p>
          )}

        {entries.map((entry) =>
          editingId === entry.id ? (
            <EducationForm
              key={entry.id}
              initial={entry}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <div key={entry.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{entry.institution}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[entry.degree, entry.fieldOfStudy]
                      .filter(Boolean)
                      .join(" · ") || "Studies"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateOnly(entry.startDate)} –{" "}
                    {entry.endDate ? formatDateOnly(entry.endDate) : "present"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                    size="sm"
                    aria-label={`Remove ${entry.institution}`}
                    onClick={() => remove(entry)}
                    disabled={deleteEducation.isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}
