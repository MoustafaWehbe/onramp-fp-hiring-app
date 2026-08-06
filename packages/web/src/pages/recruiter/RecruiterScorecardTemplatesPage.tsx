import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import {
  useCreateScorecardTemplate,
  useDeleteScorecardTemplate,
  useScorecardTemplates,
  useUpdateScorecardTemplate,
} from "../../features/scorecards/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import type {
  ScorecardTemplate,
  StarterCriterion,
} from "../../types/scorecards";

interface DraftCriterion {
  /** Present only for criteria that already exist server-side. */
  id?: string;
  label: string;
  description: string;
}

interface Draft {
  templateId?: string;
  title: string;
  criteria: DraftCriterion[];
}

function emptyDraft(starter: StarterCriterion[] = []): Draft {
  return {
    title: "",
    criteria:
      starter.length > 0
        ? starter.map((criterion) => ({
            label: criterion.label,
            description: criterion.description,
          }))
        : [{ label: "", description: "" }],
  };
}

function draftFrom(template: ScorecardTemplate): Draft {
  return {
    templateId: template.id,
    title: template.title,
    criteria: template.criteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      description: criterion.description ?? "",
    })),
  };
}

/**
 * Scorecard template management.
 *
 * The editor keeps each existing criterion's id as it moves up and down the
 * list, so reordering and renaming never look like a delete-and-recreate to
 * the server — which matters because a recreated criterion would abandon
 * every rating already given against it.
 */
export function RecruiterScorecardTemplatesPage() {
  const templatesQuery = useScorecardTemplates();
  const createTemplate = useCreateScorecardTemplate();
  const updateTemplate = useUpdateScorecardTemplate();
  const deleteTemplate = useDeleteScorecardTemplate();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = templatesQuery.data?.templates ?? [];
  const starterCriteria = templatesQuery.data?.starterCriteria ?? [];
  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  const updateCriterion = (index: number, patch: Partial<DraftCriterion>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            criteria: current.criteria.map((criterion, position) =>
              position === index ? { ...criterion, ...patch } : criterion,
            ),
          }
        : current,
    );
  };

  const moveCriterion = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const target = index + direction;
      if (target < 0 || target >= current.criteria.length) {
        return current;
      }
      const criteria = [...current.criteria];
      [criteria[index], criteria[target]] = [criteria[target], criteria[index]];
      return { ...current, criteria };
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    const criteria = draft.criteria
      .map((criterion) => ({
        id: criterion.id,
        label: criterion.label.trim(),
        description: criterion.description.trim() || null,
      }))
      .filter((criterion) => criterion.label.length > 0);

    if (!draft.title.trim()) {
      setError("Give the template a name.");
      return;
    }
    if (criteria.length === 0) {
      setError("Add at least one criterion.");
      return;
    }

    try {
      setError(null);
      const input = { title: draft.title.trim(), criteria };

      if (draft.templateId) {
        await updateTemplate.mutateAsync({ id: draft.templateId, input });
      } else {
        await createTemplate.mutateAsync(input);
      }
      setDraft(null);
    } catch (err) {
      // A 409 here is the "already scored against" guard, whose message names
      // the criteria — worth surfacing verbatim rather than replacing.
      setError(getApiErrorMessage(err, "Couldn't save the template."));
    }
  };

  const onDelete = async (templateId: string) => {
    try {
      setError(null);
      await deleteTemplate.mutateAsync(templateId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't delete the template."));
    }
  };

  if (templatesQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (templatesQuery.isError) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(
              templatesQuery.error,
              "Couldn't load your scorecard templates.",
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Scorecard templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The criteria your team scores candidates against. Every interviewer
          fills in the same set, so their ratings can be compared.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {templates.length === 0 && !draft && (
        <Card>
          <CardHeader>
            <CardTitle>No templates yet</CardTitle>
            <CardDescription>
              Nothing can be scored until there is a set of criteria to score
              against. Start from the suggested set below, or build your own.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setDraft(emptyDraft(starterCriteria))}
            >
              Start from the suggested set
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(emptyDraft())}
            >
              Build from scratch
            </Button>
          </CardContent>
        </Card>
      )}

      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{template.title}</CardTitle>
              <CardDescription>
                {template.criteria.length}{" "}
                {template.criteria.length === 1 ? "criterion" : "criteria"}
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft(draftFrom(template))}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleteTemplate.isPending}
                onClick={() => void onDelete(template.id)}
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {template.criteria.map((criterion) => (
                <li key={criterion.id} className="rounded-md border px-3 py-2">
                  <p className="text-sm font-medium">{criterion.label}</p>
                  {criterion.description && (
                    <p className="text-xs text-muted-foreground">
                      {criterion.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {templates.length > 0 && !draft && (
        <Button type="button" onClick={() => setDraft(emptyDraft())}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New template
        </Button>
      )}

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>
              {draft.templateId ? "Edit template" : "New template"}
            </CardTitle>
            <CardDescription>
              Criteria are scored 1-5. Order here is the order interviewers see.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSave}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="template-title">Template name</Label>
                <Input
                  id="template-title"
                  value={draft.title}
                  placeholder="Engineering interview loop"
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Criteria</p>
                {draft.criteria.map((criterion, index) => (
                  <div
                    key={criterion.id ?? `new-${index}`}
                    className="space-y-2 rounded-md border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          aria-label={`Criterion ${index + 1} label`}
                          placeholder="Technical"
                          value={criterion.label}
                          onChange={(event) =>
                            updateCriterion(index, { label: event.target.value })
                          }
                        />
                        <Input
                          aria-label={`Criterion ${index + 1} description`}
                          placeholder="What interviewers should look for (optional)"
                          value={criterion.description}
                          onChange={(event) =>
                            updateCriterion(index, {
                              description: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${criterion.label || `criterion ${index + 1}`} up`}
                          disabled={index === 0}
                          onClick={() => moveCriterion(index, -1)}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${criterion.label || `criterion ${index + 1}`} down`}
                          disabled={index === draft.criteria.length - 1}
                          onClick={() => moveCriterion(index, 1)}
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${criterion.label || `criterion ${index + 1}`}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              criteria: draft.criteria.filter(
                                (_item, position) => position !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      criteria: [
                        ...draft.criteria,
                        { label: "", description: "" },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add criterion
                </Button>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save template"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(null);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
