import { Github, Globe, Linkedin, Twitter, type LucideIcon } from "lucide-react";
import type { ProfileLinks } from "../../../types/candidate";

/**
 * Links render as icon buttons rather than a list of raw URLs.
 *
 * Labels are free text, so the icon is matched on the label and the host and
 * falls back to a globe. A wrong guess costs nothing — the accessible name
 * and tooltip always carry the label the candidate actually typed.
 */
const ICON_MATCHERS: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /github/i, icon: Github },
  { pattern: /linked ?in/i, icon: Linkedin },
  { pattern: /twitter|x\.com/i, icon: Twitter },
];

export function iconForLink(label: string, url: string): LucideIcon {
  const haystack = `${label} ${url}`;
  return (
    ICON_MATCHERS.find((matcher) => matcher.pattern.test(haystack))?.icon ??
    Globe
  );
}

export function ProfileLinkIcons({
  links,
}: {
  links: ProfileLinks | null | undefined;
}) {
  const entries = Object.entries(links ?? {});

  if (entries.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {entries.map(([label, url]) => {
        const Icon = iconForLink(label, url);

        return (
          <li key={label}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title={label}
              aria-label={label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
