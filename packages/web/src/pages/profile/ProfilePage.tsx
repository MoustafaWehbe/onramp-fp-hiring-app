import { isAxiosError } from "axios";
import { useEffect, useRef } from "react";
import { ApplicationPipelineCard } from "../../features/candidate/components/ApplicationPipelineCard";
import { IdentityCard } from "../../features/candidate/components/IdentityCard";
import { WorkHistoryCard } from "../../features/candidate/components/WorkHistoryCard";
import { SkillsCard } from "../../features/candidate/components/SkillsCard";
import { EducationCard } from "../../features/candidate/components/EducationCard";
import { ProfileLinksCard } from "../../features/candidate/components/ProfileLinksCard";
import { ProfileQuickLinks } from "../../features/candidate/components/ProfileQuickLinks";
import { ResumeCard } from "../../features/candidate/components/ResumeCard";
import {
  useProfile,
  useSeedProfileFromResume,
} from "../../features/candidate/hooks";

export function ProfilePage() {
  // Shared with IdentityCard's own useProfile() call via React Query's cache
  // (same query key) — this doesn't trigger a second network request.
  const profileQuery = useProfile();
  const profileMissing =
    isAxiosError(profileQuery.error) && profileQuery.error.response?.status === 404;
  const profileExists = profileQuery.isSuccess && !profileMissing;
  const seedProfile = useSeedProfileFromResume();
  const hasAttemptedSeed = useRef(false);

  // Pre-fills skills and a headline from the candidate's parsed resume the
  // first time they open this page. The server refuses a second run, so this
  // can never overwrite an edit — but firing it once per mount keeps a
  // pointless request off every visit.
  useEffect(() => {
    if (!profileExists || hasAttemptedSeed.current) {
      return;
    }

    hasAttemptedSeed.current = true;
    seedProfile.mutate();
  }, [profileExists, seedProfile]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Fixed-position, so it navigates the sections below without taking
          part in the page's layout or shifting the column. */}
      <ProfileQuickLinks />

      {/* Slightly wider than before to give the banner room, and more
          vertical rhythm between cards — the cheapest way to stop a stack of
          sections reading as one long form.

          The md:grid-cols split (not lg:, unlike the candidate homepage's
          equivalent sidebar) matches ApplicationPipelineCard's own
          useIsMdUp gate exactly — using a different breakpoint here would
          open a range where the card has mounted but the grid hasn't split
          yet, stacking it awkwardly under a still-single left column. */}
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <IdentityCard />
            <WorkHistoryCard profileExists={profileExists} />
            <EducationCard hasProfile={profileExists} />
            <SkillsCard profileExists={profileExists} />
            <ProfileLinksCard
              hasProfile={profileExists}
              links={profileQuery.data?.links}
            />
            <ResumeCard
              profileExists={profileExists}
              resumeUrl={profileQuery.data?.resumeUrl}
            />
          </div>

          {/* self-start keeps this column's height to its own content
              instead of stretching to match the (much taller) left column —
              sticky has nothing to visually stick against otherwise. top-20
              reuses the same offset ProfileSection's own scroll-mt-20 uses
              to clear the sticky h-16 header, so the card settles just
              below the nav rather than under it. */}
          <aside className="md:sticky md:top-20 md:self-start">
            <ApplicationPipelineCard />
          </aside>
        </div>
      </section>
    </div>
  );
}
