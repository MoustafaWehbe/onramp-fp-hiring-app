import { isAxiosError } from "axios";
import { IdentityCard } from "../../features/candidate/components/IdentityCard";
import { WorkHistoryCard } from "../../features/candidate/components/WorkHistoryCard";
import { SkillsCard } from "../../features/candidate/components/SkillsCard";
import { ResumeCard } from "../../features/candidate/components/ResumeCard";
import { useProfile } from "../../features/candidate/hooks";

export function ProfilePage() {
  // Shared with IdentityCard's own useProfile() call via React Query's cache
  // (same query key) — this doesn't trigger a second network request.
  const profileQuery = useProfile();
  const profileMissing =
    isAxiosError(profileQuery.error) && profileQuery.error.response?.status === 404;
  const profileExists = profileQuery.isSuccess && !profileMissing;

  return (
    <div className="bg-stone-50">
      <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <IdentityCard />
        <WorkHistoryCard profileExists={profileExists} />
        <SkillsCard profileExists={profileExists} />
        <ResumeCard
          profileExists={profileExists}
          resumeUrl={profileQuery.data?.resumeUrl}
        />
      </section>
    </div>
  );
}
