import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import { CompanyLogo } from "../../components/shared/CompanyLogo";
import {
  useCompanyProfile,
  useCreateCompanyProfile,
  useUpdateCompanyProfile,
} from "../../features/company/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { ACCENT_GRADIENT, CARD_CLASS } from "../../features/candidate/theme";
import { cn } from "../../lib/utils";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "../../types/company";

const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your company name")
    .max(255, "Keep the name under 255 characters"),
  industry: z
    .string()
    .trim()
    .min(1, "Enter your industry")
    .max(255, "Keep the industry under 255 characters"),
  size: z
    .string()
    .trim()
    .min(1, "Enter your company size")
    .max(100, "Keep the size under 100 characters"),
  location: z
    .string()
    .trim()
    .min(1, "Enter your company location")
    .max(255, "Keep the location under 255 characters"),
  contact: z
    .string()
    .trim()
    .min(1, "Enter a hiring contact")
    .max(255, "Keep the contact under 255 characters"),
  website: z
    .string()
    .trim()
    .max(2_048, "Keep the website URL under 2,048 characters")
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a complete URL, including https://",
    ),
  description: z
    .string()
    .trim()
    .max(10_000, "Keep the description under 10,000 characters"),
  logoUrl: z
    .string()
    .trim()
    .max(2_048, "Keep the logo URL under 2,048 characters")
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a complete image URL, including https://",
    ),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

function toFormValues(profile?: CompanyProfile): CompanyFormValues {
  return {
    name: profile?.name ?? "",
    industry: profile?.industry ?? "",
    size: profile?.size ?? "",
    location: profile?.location ?? "",
    contact: profile?.contact ?? "",
    website: profile?.website ?? "",
    description: profile?.description ?? "",
    logoUrl: profile?.logoUrl ?? "",
  };
}

function toInput(values: CompanyFormValues): CompanyProfileInput {
  return {
    name: values.name.trim(),
    industry: values.industry.trim(),
    size: values.size.trim(),
    location: values.location.trim(),
    contact: values.contact.trim(),
    website: values.website.trim() || undefined,
    description: values.description.trim() || undefined,
    logoUrl: values.logoUrl.trim() || undefined,
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

function CompanyFormSkeleton() {
  return (
    <Card aria-label="Loading company profile">
      <CardHeader className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecruiterCreateCompanyPage() {
  const navigate = useNavigate();
  const profileQuery = useCompanyProfile();
  const createProfile = useCreateCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();
  const profileMissing =
    isAxiosError(profileQuery.error) &&
    profileQuery.error.response?.status === 404;
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(toFormValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  async function submit(values: CompanyFormValues) {
    const input = toInput(values);

    try {
      if (profileQuery.data) {
        await updateProfile.mutateAsync({
          id: profileQuery.data.id,
          input,
        });
        toast.success("Company profile updated");
      } else {
        await createProfile.mutateAsync(input);
        toast.success("Company profile created");
      }

      navigate("/recruiter/jobs/create");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Couldn't save your company profile."),
      );
    }
  }

  const isSaving = createProfile.isPending || updateProfile.isPending;
  // Live preview of the banner/logo, so a recruiter sees what candidates
  // will see on the careers page as they type — same treatment as that page.
  const previewName = form.watch("name");
  const previewLogoUrl = form.watch("logoUrl");

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-primary">Recruiter setup</p>
          <h1 className="mt-2 text-4xl font-bold">Company profile</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Complete these details before publishing jobs. Candidates use this
            context to understand who they would be joining.
          </p>
        </div>

        {profileQuery.isLoading ? (
          <CompanyFormSkeleton />
        ) : profileQuery.isError && !profileMissing ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(
                  profileQuery.error,
                  "Couldn't load your company profile.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void profileQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Same identity-header treatment as the candidate profile: a
                gradient cover band with the logo pulled up over it — live,
                so it previews exactly what candidates will see. */}
            <Card className={cn(CARD_CLASS, "mb-6 overflow-hidden")}>
              <div
                className={cn("h-24 w-full sm:h-28", ACCENT_GRADIENT)}
                aria-hidden="true"
              />
              <div className="px-6 pb-6">
                <div className="-mt-10 sm:-mt-12">
                  <CompanyLogo
                    name={previewName || "Your company"}
                    logoUrl={previewLogoUrl}
                    className="h-20 w-20 sm:h-24 sm:w-24"
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {previewName || "Your company"} on its public careers page
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {profileQuery.data
                    ? "Update company details"
                    : "Tell us about your company"}
                </CardTitle>
                <CardDescription>
                  All five setup fields are required. Website, description,
                  and logo are optional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit((values) => void submit(values))}
                  noValidate
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input
                        id="company-name"
                        placeholder="Northstar Labs"
                        aria-invalid={Boolean(form.formState.errors.name)}
                        {...form.register("name")}
                      />
                      <FieldError
                        message={form.formState.errors.name?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-industry">Industry</Label>
                      <Input
                        id="company-industry"
                        placeholder="Developer tools"
                        aria-invalid={Boolean(form.formState.errors.industry)}
                        {...form.register("industry")}
                      />
                      <FieldError
                        message={form.formState.errors.industry?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-size">Company size</Label>
                      <Input
                        id="company-size"
                        placeholder="11–50 employees"
                        aria-invalid={Boolean(form.formState.errors.size)}
                        {...form.register("size")}
                      />
                      <FieldError
                        message={form.formState.errors.size?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-location">Location</Label>
                      <Input
                        id="company-location"
                        placeholder="Beirut, Lebanon"
                        aria-invalid={Boolean(form.formState.errors.location)}
                        {...form.register("location")}
                      />
                      <FieldError
                        message={form.formState.errors.location?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-contact">Hiring contact</Label>
                    <Input
                      id="company-contact"
                      placeholder="talent@northstar.example or +961 1 234 567"
                      aria-invalid={Boolean(form.formState.errors.contact)}
                      {...form.register("contact")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add the email address or phone number candidates can
                      use.
                    </p>
                    <FieldError
                      message={form.formState.errors.contact?.message}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-website">
                        Website (optional)
                      </Label>
                      <Input
                        id="company-website"
                        type="url"
                        placeholder="https://northstar.example"
                        aria-invalid={Boolean(form.formState.errors.website)}
                        {...form.register("website")}
                      />
                      <FieldError
                        message={form.formState.errors.website?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-logo-url">
                        Logo URL (optional)
                      </Label>
                      <Input
                        id="company-logo-url"
                        type="url"
                        placeholder="https://northstar.example/logo.png"
                        aria-invalid={Boolean(form.formState.errors.logoUrl)}
                        {...form.register("logoUrl")}
                      />
                      <FieldError
                        message={form.formState.errors.logoUrl?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="company-description"
                      rows={5}
                      placeholder="What does your company build, and how does the team work?"
                      {...form.register("description")}
                    />
                  </div>

                  <div className="flex justify-end border-t pt-6">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving
                        ? "Saving…"
                        : profileQuery.data
                          ? "Save and continue"
                          : "Create and continue"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
