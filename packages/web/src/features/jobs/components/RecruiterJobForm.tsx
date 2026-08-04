import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";
import type {
  RecruiterJobCreateInput,
  RecruiterJobInput,
  RecruiterJobRecord,
} from "../../../types/jobs";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a job title")
      .max(255, "Keep the title under 255 characters"),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
    experienceMin: z
      .number({ invalid_type_error: "Enter a minimum experience level" })
      .int("Use whole years")
      .min(0, "Experience can't be negative")
      .max(100, "Experience must be 100 years or less"),
    experienceMax: z
      .number({ invalid_type_error: "Enter a maximum experience level" })
      .int("Use whole years")
      .min(0, "Experience can't be negative")
      .max(100, "Experience must be 100 years or less"),
    location: z
      .string()
      .trim()
      .max(255, "Keep the location under 255 characters"),
    isRemote: z.boolean(),
    salaryMin: z
      .number({ invalid_type_error: "Enter a minimum salary" })
      .int("Use a whole-number salary")
      .min(0, "Salary can't be negative")
      .max(1_000_000_000, "Salary is too large"),
    salaryMax: z
      .number({ invalid_type_error: "Enter a maximum salary" })
      .int("Use a whole-number salary")
      .min(0, "Salary can't be negative")
      .max(1_000_000_000, "Salary is too large"),
    salaryCurrency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code"),
    skills: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(100, "Keep each skill under 100 characters"),
      )
      .min(1, "Add at least one required skill")
      .max(20, "Add no more than 20 skills"),
    description: z
      .string()
      .trim()
      .min(1, "Enter a job description")
      .max(50_000, "Keep the description under 50,000 characters"),
    status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  })
  .superRefine((values, context) => {
    if (values.experienceMin > values.experienceMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["experienceMax"],
        message: "Maximum experience must be at least the minimum",
      });
    }

    if (values.salaryMin > values.salaryMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Maximum salary must be at least the minimum",
      });
    }

    if (!values.isRemote && !values.location) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Add a location or mark this role as remote",
      });
    }
  });

type JobFormValues = z.infer<typeof jobFormSchema>;

function initialValues(job?: RecruiterJobRecord): JobFormValues {
  return {
    title: job?.title ?? "",
    employmentType: job?.employmentType ?? "FULL_TIME",
    experienceMin: job?.experienceMin ?? 0,
    experienceMax: job?.experienceMax ?? 3,
    location: job?.location ?? "",
    isRemote: job?.isRemote ?? false,
    salaryMin: job?.salaryMin ?? 0,
    salaryMax: job?.salaryMax ?? 0,
    salaryCurrency: job?.salaryCurrency ?? "USD",
    skills: job?.skills.map((skill) => skill.name) ?? [],
    description: job?.description ?? "",
    status: job?.status ?? "DRAFT",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

interface BaseRecruiterJobFormProps {
  isSubmitting: boolean;
  submitLabel: string;
}

interface CreateRecruiterJobFormProps extends BaseRecruiterJobFormProps {
  mode: "create";
  initialJob?: undefined;
  onSubmit: (input: RecruiterJobCreateInput) => Promise<void>;
}

interface EditRecruiterJobFormProps extends BaseRecruiterJobFormProps {
  mode: "edit";
  initialJob: RecruiterJobRecord;
  onSubmit: (input: RecruiterJobInput) => Promise<void>;
}

type RecruiterJobFormProps =
  | CreateRecruiterJobFormProps
  | EditRecruiterJobFormProps;

export function RecruiterJobForm(props: RecruiterJobFormProps) {
  const { initialJob, isSubmitting, submitLabel } = props;
  const [skillInput, setSkillInput] = useState("");
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: initialValues(initialJob),
  });
  const skills = form.watch("skills");
  const isRemote = form.watch("isRemote");

  function addSkill() {
    const skill = skillInput.trim();

    if (!skill) {
      return;
    }

    if (
      skills.some(
        (existing) => existing.toLocaleLowerCase() === skill.toLocaleLowerCase(),
      )
    ) {
      setSkillInput("");
      return;
    }

    if (skills.length >= 20) {
      form.setError("skills", {
        type: "manual",
        message: "Add no more than 20 skills",
      });
      return;
    }

    form.setValue("skills", [...skills, skill], {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.clearErrors("skills");
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    form.setValue(
      "skills",
      skills.filter((item) => item !== skill),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function submit(values: JobFormValues) {
    const input: RecruiterJobInput = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.location.trim() || undefined,
      salaryCurrency: values.salaryCurrency.trim().toUpperCase(),
      skills: values.skills.map((skill) => skill.trim()),
    };

    if (props.mode === "create") {
      if (input.status === "CLOSED") {
        return;
      }

      await props.onSubmit({
        ...input,
        status: input.status,
      });
      return;
    }

    await props.onSubmit(input);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={form.handleSubmit((values) => void submit(values))}
      noValidate
    >
      <section className="space-y-5" aria-labelledby="job-basics-heading">
        <div>
          <h2 id="job-basics-heading" className="text-lg font-semibold">
            Role basics
          </h2>
          <p className="text-sm text-muted-foreground">
            Give candidates a clear picture of the role and working setup.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-title">Job title</Label>
          <Input
            id="job-title"
            placeholder="Senior Product Engineer"
            aria-invalid={Boolean(form.formState.errors.title)}
            {...form.register("title")}
          />
          <FieldError message={form.formState.errors.title?.message} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-employment-type">Employment type</Label>
            <select
              id="job-employment-type"
              className={selectClassName}
              {...form.register("employmentType")}
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-status">Publishing status</Label>
            <select
              id="job-status"
              className={selectClassName}
              {...form.register("status")}
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open to applications</option>
              {props.mode === "edit" && (
                <option value="CLOSED">Closed</option>
              )}
            </select>
            <p className="text-xs text-muted-foreground">
              Draft roles remain private until you publish them.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-experience-min">
              Minimum experience (years)
            </Label>
            <Input
              id="job-experience-min"
              type="number"
              min={0}
              max={100}
              aria-invalid={Boolean(form.formState.errors.experienceMin)}
              {...form.register("experienceMin", { valueAsNumber: true })}
            />
            <FieldError
              message={form.formState.errors.experienceMin?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-experience-max">
              Maximum experience (years)
            </Label>
            <Input
              id="job-experience-max"
              type="number"
              min={0}
              max={100}
              aria-invalid={Boolean(form.formState.errors.experienceMax)}
              {...form.register("experienceMax", { valueAsNumber: true })}
            />
            <FieldError
              message={form.formState.errors.experienceMax?.message}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-location">Location</Label>
          <Input
            id="job-location"
            placeholder={isRemote ? "Optional, e.g. Americas" : "Beirut, Lebanon"}
            aria-invalid={Boolean(form.formState.errors.location)}
            {...form.register("location")}
          />
          <FieldError message={form.formState.errors.location?.message} />
          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              {...form.register("isRemote")}
            />
            This role can be fully remote
          </label>
        </div>
      </section>

      <section className="space-y-5 border-t pt-8" aria-labelledby="salary-heading">
        <div>
          <h2 id="salary-heading" className="text-lg font-semibold">
            Salary range
          </h2>
          <p className="text-sm text-muted-foreground">
            Share a transparent annual range in one currency.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_120px]">
          <div className="space-y-2">
            <Label htmlFor="job-salary-min">Minimum salary</Label>
            <Input
              id="job-salary-min"
              type="number"
              min={0}
              max={1_000_000_000}
              aria-invalid={Boolean(form.formState.errors.salaryMin)}
              {...form.register("salaryMin", { valueAsNumber: true })}
            />
            <FieldError message={form.formState.errors.salaryMin?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-salary-max">Maximum salary</Label>
            <Input
              id="job-salary-max"
              type="number"
              min={0}
              max={1_000_000_000}
              aria-invalid={Boolean(form.formState.errors.salaryMax)}
              {...form.register("salaryMax", { valueAsNumber: true })}
            />
            <FieldError message={form.formState.errors.salaryMax?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-salary-currency">Currency</Label>
            <Input
              id="job-salary-currency"
              maxLength={3}
              placeholder="USD"
              className="uppercase"
              aria-invalid={Boolean(form.formState.errors.salaryCurrency)}
              {...form.register("salaryCurrency")}
            />
            <FieldError
              message={form.formState.errors.salaryCurrency?.message}
            />
          </div>
        </div>
      </section>

      <section className="space-y-5 border-t pt-8" aria-labelledby="skills-heading">
        <div>
          <h2 id="skills-heading" className="text-lg font-semibold">
            Required skills
          </h2>
          <p className="text-sm text-muted-foreground">
            Add up to 20 skill tags. Press Enter or use Add skill.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="job-skill-input"
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addSkill();
              }
            }}
            placeholder="React"
            aria-label="Required skill"
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add skill
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Selected skills">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1 py-1 pl-2.5 pr-1"
              >
                {skill}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <FieldError message={form.formState.errors.skills?.message} />
      </section>

      <section
        className="space-y-5 border-t pt-8"
        aria-labelledby="description-heading"
      >
        <div>
          <h2 id="description-heading" className="text-lg font-semibold">
            Job description
          </h2>
          <p className="text-sm text-muted-foreground">
            Explain the work, responsibilities, and what success looks like.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-description">Description</Label>
          <Textarea
            id="job-description"
            rows={10}
            className={cn(
              "resize-y",
              form.formState.errors.description && "border-destructive",
            )}
            aria-invalid={Boolean(form.formState.errors.description)}
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>
      </section>

      <div className="flex justify-end border-t pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
