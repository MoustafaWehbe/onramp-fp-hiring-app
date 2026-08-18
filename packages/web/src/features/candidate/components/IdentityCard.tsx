import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Sparkles, UserRound } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { Textarea } from "../../../components/ui/textarea";
import { useAuth } from "../../../hooks/useAuth";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { cn } from "../../../lib/utils";
import { useCreateProfile, useProfile, useUpdateProfile } from "../hooks";
import { ProfileLinkIcons } from "./ProfileLinkIcons";
import {
  ProfileAvatar,
  ProfileSection,
  SectionAction,
} from "./ProfileSection";
import {
  ACCENT_GRADIENT,
  ACCENT_CHIP,
  CARD_CLASS,
  IDENTITY_HEADING_CLASS,
  TEXT_HEADING,
  TEXT_BODY,
  TEXT_META,
} from "../theme";
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
  const profile = profileQuery.data;

  return (
    <>
      <Card className={cn(CARD_CLASS, "overflow-hidden")}>
        {/* Cover band. Decorative only — no image upload in this pass. */}
        <div
          className={cn("h-28 w-full sm:h-36", ACCENT_GRADIENT)}
          aria-hidden="true"
        />

        {/* Negative margin pulls the avatar up over the band; the padding-left
            on larger screens keeps the name clear of it. */}
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-14">
            <ProfileAvatar
              name={user?.name ?? "?"}
              photoUrl={profile?.profilePhotoUrl}
              className="h-24 w-24 border-4 border-white text-2xl shadow-sm sm:h-28 sm:w-28 sm:text-3xl dark:border-stone-900"
            />
            {!showForm && (
              <SectionAction
                label="Edit profile details"
                onClick={() => setIsEditing(true)}
              />
            )}
          </div>

          <div className="mt-4">
           <h1
            className={cn(
              IDENTITY_HEADING_CLASS,
              TEXT_HEADING,
              )}
            >
              {user?.name ?? "Your profile"}
            </h1>
            {profile?.headline && (
              <p className={cn("mt-1 text-base", TEXT_BODY)}>
                {profile.headline}
              </p>
            )}

            <div className={cn("mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", TEXT_META)}>
              {user?.email && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              {profile?.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {profile.location}
                </span>
              )}
              {profile?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {profile.phone}
                </span>
              )}
            </div>

            {!showForm && (
              <div className="mt-4">
                <ProfileLinkIcons links={profile?.links} />
              </div>
            )}
          </div>
        </div>
      </Card>

      {showForm ? (
        <Card className={CARD_CLASS}>
          <CardContent className="p-6">
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
            {profileMissing && (
              <p className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm", ACCENT_CHIP)}>
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
          </CardContent>
        </Card>
      ) : (
        <ProfileSection
          icon={UserRound}
          title="About"
          action={
            <SectionAction
              label="Edit about"
              onClick={() => setIsEditing(true)}
            />
          }
        >
          {profile?.bio ? (
            <p className={cn("whitespace-pre-line text-sm leading-7", TEXT_BODY)}>
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a short summary of your experience and what you're looking
              for.
            </p>
          )}
        </ProfileSection>
      )}
    </>
  );
}
