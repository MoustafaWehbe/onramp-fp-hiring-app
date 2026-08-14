import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  className?: string;
}

const BASE_LOGO_CLASS =
  "h-20 w-20 shrink-0 rounded-xl border-4 border-white shadow-sm dark:border-stone-900";

/**
 * The logo when one is set, the company's initial when not. Shared between
 * the public career page and the recruiter's company-profile banner (as a
 * live preview), so both wear the same treatment.
 *
 * A remote logoUrl is recruiter-supplied and can 404 at any time, so a
 * failure swaps in the initial fallback rather than leaving a broken image.
 */
export function CompanyLogo({ name, logoUrl, className }: CompanyLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // A new URL (e.g. edited live in the company profile form) deserves a
  // fresh attempt rather than staying stuck on a previous failure.
  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imageFailed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(BASE_LOGO_CLASS, "bg-card object-contain p-2", className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        BASE_LOGO_CLASS,
        "flex items-center justify-center bg-muted text-2xl font-bold text-muted-foreground",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
