import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { createSkill, searchSkills } from "../../features/skills/api";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type { SkillOption } from "../../types/skills";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SKILL_PILL_CLASS } from "./styles";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

type SearchState = {
  queryKey: string;
  status: "idle" | "loading" | "success" | "error";
  skills: SkillOption[];
};

export interface SkillsInputProps {
  value: SkillOption[];
  onChange: (skills: SkillOption[]) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  maxSkills?: number;
  disabled?: boolean;
  invalid?: boolean;
}

function skillKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function SkillsInput({
  value,
  onChange,
  id,
  label = "Search or add skills",
  placeholder = "Start typing a skill",
  maxSkills = 50,
  disabled = false,
  invalid = false,
}: SkillsInputProps) {
  const generatedId = useId();
  const inputId = id ?? `skills-input-${generatedId}`;
  const listboxId = `${inputId}-suggestions`;
  const helpId = `${inputId}-help`;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<SearchState>({
    queryKey: "",
    status: "idle",
    skills: [],
  });

  const trimmedQuery = query.trim();
  const queryKey = skillKey(trimmedQuery);
  const atLimit = value.length >= maxSkills;
  const inputDisabled = disabled || isCreating || atLimit;

  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setSearchState({ queryKey, status: "idle", skills: [] });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState({ queryKey, status: "loading", skills: [] });

      void searchSkills(trimmedQuery, controller.signal)
        .then((skills) => {
          setSearchState({ queryKey, status: "success", skills });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchState({ queryKey, status: "error", skills: [] });
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [queryKey, trimmedQuery]);

  const searchIsCurrent = searchState.queryKey === queryKey;
  const suggestions = useMemo(() => {
    if (!searchIsCurrent || searchState.status !== "success") {
      return [];
    }

    const selectedKeys = new Set(value.map((skill) => skillKey(skill.name)));
    return searchState.skills.filter(
      (skill) => !selectedKeys.has(skillKey(skill.name)),
    );
  }, [searchIsCurrent, searchState.skills, searchState.status, value]);

  const hasExactMatch = [...value, ...searchState.skills].some(
    (skill) => skillKey(skill.name) === queryKey,
  );
  const canCreate =
    searchIsCurrent &&
    searchState.status === "success" &&
    trimmedQuery.length >= MIN_SEARCH_LENGTH &&
    !hasExactMatch &&
    !atLimit;
  const optionCount = suggestions.length + (canCreate ? 1 : 0);
  const shouldShowMenu =
    isOpen && trimmedQuery.length >= MIN_SEARCH_LENGTH && !disabled && !atLimit;

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(optionCount - 1, 0)));
  }, [optionCount]);

  function selectSkill(skill: SkillOption) {
    const exists = value.some(
      (selected) =>
        selected.id === skill.id || skillKey(selected.name) === skillKey(skill.name),
    );

    if (!exists && value.length < maxSkills) {
      onChange([...value, skill]);
    }

    setQuery("");
    setCreateError(null);
    setIsOpen(false);
  }

  async function addNewSkill() {
    if (!canCreate || isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const skill = await createSkill(trimmedQuery);
      selectSkill(skill);
    } catch (error) {
      setCreateError(
        getApiErrorMessage(error, "Couldn't add this skill. Please try again."),
      );
    } finally {
      setIsCreating(false);
    }
  }

  function removeSkill(skill: SkillOption) {
    onChange(value.filter((selected) => selected.id !== skill.id));
  }

  function chooseActiveOption() {
    const suggestion = suggestions[activeIndex];
    if (suggestion) {
      selectSkill(suggestion);
      return;
    }

    if (canCreate && activeIndex === suggestions.length) {
      void addNewSkill();
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            autoComplete="off"
            value={query}
            placeholder={atLimit ? `Maximum of ${maxSkills} skills reached` : placeholder}
            disabled={inputDisabled}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={shouldShowMenu}
            aria-invalid={invalid}
            aria-describedby={helpId}
            aria-activedescendant={
              shouldShowMenu && optionCount > 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onChange={(event) => {
              setQuery(event.target.value);
              setCreateError(null);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
                return;
              }

              if (event.key === "ArrowDown" && optionCount > 0) {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % optionCount);
                return;
              }

              if (event.key === "ArrowUp" && optionCount > 0) {
                event.preventDefault();
                setActiveIndex(
                  (current) => (current - 1 + optionCount) % optionCount,
                );
                return;
              }

              if (event.key === "Enter" && trimmedQuery) {
                event.preventDefault();
                chooseActiveOption();
              }
            }}
          />

          {shouldShowMenu && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Skill suggestions"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {(!searchIsCurrent || searchState.status === "loading") && (
                <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Searching skills...
                </p>
              )}

              {searchIsCurrent && searchState.status === "error" && (
                <p className="px-3 py-2 text-sm text-destructive" role="alert">
                  Couldn't search skills. Please try again.
                </p>
              )}

              {suggestions.map((skill, index) => (
                <button
                  key={skill.id}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "flex w-full items-center rounded-sm px-3 py-2 text-left text-sm",
                    index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSkill(skill)}
                >
                  {skill.name}
                </button>
              ))}

              {canCreate && (
                <button
                  id={`${listboxId}-option-${suggestions.length}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === suggestions.length}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm",
                    activeIndex === suggestions.length
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void addNewSkill()}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Add "{trimmedQuery}" as a new skill
                </button>
              )}

              {searchIsCurrent &&
                searchState.status === "success" &&
                suggestions.length === 0 &&
                !canCreate && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No other matching skills.
                  </p>
                )}
            </div>
          )}
        </div>
        <p id={helpId} className="text-xs text-muted-foreground">
          {atLimit
            ? `${value.length} of ${maxSkills} skills selected.`
            : `Type at least ${MIN_SEARCH_LENGTH} characters to search the shared skill list.`}
        </p>
        {createError && (
          <p className="text-sm text-destructive" role="alert">
            {createError}
          </p>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected skills">
          {value.map((skill) => (
            <Badge
              key={skill.id}
              variant="outline"
              className={cn(
                "gap-1 rounded-full py-1 pl-3 pr-1 text-sm",
                SKILL_PILL_CLASS,
              )}
            >
              {skill.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-indigo-900"
                onClick={() => removeSkill(skill)}
                disabled={disabled || isCreating}
                aria-label={`Remove ${skill.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
