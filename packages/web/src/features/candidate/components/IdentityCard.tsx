import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Mail, MapPin, Pencil, Phone, Sparkles, UserRound } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { Textarea } from "../../../components/ui/textarea";
import { useAuth } from "../../../hooks/useAuth";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { useCreateProfile, useProfile, useUpdateProfile } from "../hooks";
import { ACCENT_GRADIENT, CARD_CLASS } from "../theme";
import type { CandidateProfileRecord } from "../../../types/candidate";

const profileFormSchema = z.object({
  headline: z.string().max(255, "Keep it under 255 characters"),
  bio: z.string(),
  phone: z.string().max(30, "Keep it under 30 characters"),
  location: z.string().max(255, "Keep it under 255 characters"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function toFormValues(profile?: CandidateProfileRecord | null): ProfileFormValues {
  return {
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function IdentityCard() {
  const { user } = useAuth();
  const profileQuery = useProfile();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);

  const profileMissing =
    isAxiosError(profileQuery.error) && profileQuery.error.response?.status === 404;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(toFormValues(profileQuery.data));
    }
  }, [profileQuery.data, form]);

  if (profileQuery.isLoading) {
    return (
      <Card className={CARD_CLASS}>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError && !profileMissing) {
    return (
      <Card className={CARD_CLASS}>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-destructive" role="alert">
            {getApiErrorMessage(profileQuery.error, "Couldn't load your profile.")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void profileQuery.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: ProfileFormValues) {
    const mutation = profileMissing ? createProfile : updateProfile;

    try {
      await mutation.mutateAsync(values);
      toast.success(profileMissing ? "Profile created" : "Profile updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          profileMissing ? "Couldn't create your profile." : "Couldn't save your profile.",
        ),
      );
    }
  }

  const isSaving = createProfile.isPending || updateProfile.isPending;
  const showForm = isEditing || profileMissing;

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white ${ACCENT_GRADIENT}`}
            aria-hidden="true"
          >
            {user ? initials(user.name) : <UserRound className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl">{user?.name ?? "Your profile"}</CardTitle>
            {user?.email && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </p>
            )}
          </div>
        </div>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {showForm ? (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {profileMissing && (
              <p className="flex items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                Set up your candidate profile to start applying.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  placeholder="Senior Full-Stack Engineer"
                  {...form.register("headline")}
                />
                {form.formState.errors.headline && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.headline.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Remote, US time zones"
                  {...form.register("location")}
                />
                {form.formState.errors.location && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1-555-0100"
                  {...form.register("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="A short summary of your experience and what you're looking for."
                {...form.register("bio")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : profileMissing
                    ? "Create profile"
                    : "Save changes"}
              </Button>
              {!profileMissing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.reset(toFormValues(profileQuery.data));
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {profileQuery.data?.headline && (
              <p className="text-sm font-medium text-foreground">
                {profileQuery.data.headline}
              </p>
            )}
            {profileQuery.data?.bio && (
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {profileQuery.data.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {profileQuery.data?.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {profileQuery.data.location}
                </span>
              )}
              {profileQuery.data?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {profileQuery.data.phone}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
