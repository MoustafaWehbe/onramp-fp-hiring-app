import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, LinkIcon, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { useUpdateProfileExtras } from "../hooks";
import { ProfileSection, SectionAction } from "./ProfileSection";
import type { ProfileLinks } from "../../../types/candidate";

/**
 * Labels are free text rather than a fixed set of platforms, so a candidate
 * can add whatever they actually have — a portfolio, a conference talk — not
 * just the three sites a dropdown would have guessed.
 */
export function ProfileLinksCard({
  hasProfile,
  links,
}: {
  hasProfile: boolean;
  links: ProfileLinks | null | undefined;
}) {
  const updateExtras = useUpdateProfileExtras();
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const entries = Object.entries(links ?? {});

  function save(nextLinks: ProfileLinks, onDone?: () => void): void {
    updateExtras.mutate(
      // An empty map is sent as null so "no links" is stored as absent
      // rather than as an empty object.
      { links: Object.keys(nextLinks).length > 0 ? nextLinks : null },
      {
        onSuccess: () => {
          toast.success("Links updated.");
          onDone?.();
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't save your links.")),
      },
    );
  }

  function add(): void {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();

    if (!trimmedLabel || !trimmedUrl) {
      toast.error("Add both a label and a URL.");
      return;
    }

    save({ ...(links ?? {}), [trimmedLabel]: trimmedUrl }, () => {
      setLabel("");
      setUrl("");
      setIsAdding(false);
    });
  }

  function remove(key: string): void {
    const next = { ...(links ?? {}) };
    delete next[key];
    save(next);
  }

  return (
    <ProfileSection
      icon={LinkIcon}
      title="Links"
      description="Shown as icon buttons at the top of your profile."
      action={
        hasProfile && !isAdding ? (
          <SectionAction
            label="Add link"
            variant="add"
            onClick={() => setIsAdding(true)}
          />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {!hasProfile && (
          <p className="text-sm text-muted-foreground">
            Create your profile to add links.
          </p>
        )}

        {isAdding && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="link-label">Label</Label>
                <Input
                  id="link-label"
                  placeholder="GitHub"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://github.com/you"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={add}
                disabled={updateExtras.isPending}
              >
                {updateExtras.isPending ? "Saving…" : "Add link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {hasProfile && entries.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">
            No links added yet.
          </p>
        )}

        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{key}</p>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1.5 truncate text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{value}</span>
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove ${key} link`}
              onClick={() => remove(key)}
              disabled={updateExtras.isPending}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </ProfileSection>
  );
}
