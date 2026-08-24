import { Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { employmentTypeLabels } from "../../lib/job-presentation";
import type { EmploymentType } from "../../types/jobs";

export type RemoteFilter = "" | "remote" | "onsite";

export type JobFilterKey =
  | "q"
  | "location"
  | "remote"
  | "employmentType"
  | "skill"
  | "currency"
  | "salaryMin"
  | "salaryMax";

export interface JobFilterValues {
  q: string;
  location: string;
  remote: RemoteFilter;
  employmentType: "" | EmploymentType;
  skill: string;
  /** Explicit URL value. The page may supply a separate single-currency default. */
  currency: string;
  salaryMin: string;
  salaryMax: string;
}

interface JobDiscoveryFiltersProps {
  values: JobFilterValues;
  skills: readonly string[];
  currencies: readonly string[];
  effectiveSalaryCurrency: string;
  salaryRangeError?: string;
  onChange: (key: JobFilterKey, value: string) => void;
  onClearAll: () => void;
}

interface LegacyStackFiltersProps {
  selectedStack: string;
  stacks: readonly string[];
  onStackChange: (stack: string) => void;
}

type JobFiltersProps = JobDiscoveryFiltersProps | LegacyStackFiltersProps;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function JobFilters(props: JobFiltersProps) {
  // CandidateHomePage intentionally keeps its compact stack picker. Retain
  // that small presentation while JobsPage uses the full discovery controls.
  if ("selectedStack" in props) {
    return (
      <div aria-label="Job filters">
        <div className="flex flex-wrap gap-2" role="list" aria-label="Stacks">
          {props.stacks.map((stack) => {
            const isSelected = props.selectedStack === stack;
            return (
              <Button
                key={stack}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => props.onStackChange(stack)}
                aria-pressed={isSelected}
              >
                {stack}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  const {
    values,
    skills,
    currencies,
    effectiveSalaryCurrency,
    salaryRangeError,
    onChange,
    onClearAll,
  } = props;
  const currencyLabel = effectiveSalaryCurrency || "selected currency";
  const activeFilters: Array<{ key: JobFilterKey; label: string }> = [];

  if (values.q.trim()) {
    activeFilters.push({ key: "q", label: `Keyword: ${values.q.trim()}` });
  }
  if (values.location.trim()) {
    activeFilters.push({
      key: "location",
      label: `Location: ${values.location.trim()}`,
    });
  }
  if (values.remote) {
    activeFilters.push({
      key: "remote",
      label: values.remote === "remote" ? "Remote" : "On-site",
    });
  }
  if (values.employmentType) {
    activeFilters.push({
      key: "employmentType",
      label: employmentTypeLabels[values.employmentType],
    });
  }
  if (values.skill) {
    activeFilters.push({ key: "skill", label: `Skill: ${values.skill}` });
  }
  if (values.currency && currencies.length > 1) {
    activeFilters.push({
      key: "currency",
      label: `Currency: ${values.currency}`,
    });
  }
  if (values.salaryMin) {
    activeFilters.push({
      key: "salaryMin",
      label: `Salary from ${currencyLabel} ${Number(values.salaryMin).toLocaleString()}`,
    });
  }
  if (values.salaryMax) {
    activeFilters.push({
      key: "salaryMax",
      label: `Salary to ${currencyLabel} ${Number(values.salaryMax).toLocaleString()}`,
    });
  }

  const salaryInputsDisabled = !effectiveSalaryCurrency;

  return (
    <div className="space-y-5" aria-label="Job filters">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5 xl:col-span-2">
          <Label htmlFor="jobs-keyword">Keyword</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="jobs-keyword"
              value={values.q}
              className="pl-9"
              placeholder="Title, company, description, or skill"
              onChange={(event) => onChange("q", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-location">Location</Label>
          <Input
            id="jobs-location"
            value={values.location}
            placeholder="City or country"
            onChange={(event) => onChange("location", event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-workplace">Workplace</Label>
          <select
            id="jobs-workplace"
            className={SELECT_CLASS}
            value={values.remote}
            onChange={(event) => onChange("remote", event.target.value)}
          >
            <option value="">Remote or on-site</option>
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-employment-type">Employment type</Label>
          <select
            id="jobs-employment-type"
            className={SELECT_CLASS}
            value={values.employmentType}
            onChange={(event) =>
              onChange("employmentType", event.target.value)
            }
          >
            <option value="">All employment types</option>
            {(Object.keys(employmentTypeLabels) as EmploymentType[]).map(
              (employmentType) => (
                <option key={employmentType} value={employmentType}>
                  {employmentTypeLabels[employmentType]}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-skill">Skill</Label>
          <select
            id="jobs-skill"
            className={SELECT_CLASS}
            value={values.skill}
            onChange={(event) => onChange("skill", event.target.value)}
          >
            <option value="">All skills</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>

        <fieldset
          className="grid gap-3 sm:grid-cols-3 md:col-span-2 xl:col-span-2"
          aria-describedby={salaryRangeError ? "jobs-salary-error" : undefined}
        >
          <legend className="sr-only">Salary range</legend>
          <div className="space-y-1.5">
            <Label htmlFor="jobs-salary-currency">Salary currency</Label>
            <select
              id="jobs-salary-currency"
              className={SELECT_CLASS}
              value={effectiveSalaryCurrency}
              disabled={currencies.length <= 1}
              onChange={(event) => onChange("currency", event.target.value)}
            >
              {currencies.length > 1 && (
                <option value="">Choose currency</option>
              )}
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobs-salary-min">Minimum salary</Label>
            <Input
              id="jobs-salary-min"
              type="number"
              min={0}
              inputMode="numeric"
              value={values.salaryMin}
              disabled={salaryInputsDisabled}
              aria-invalid={Boolean(salaryRangeError)}
              placeholder="No minimum"
              onChange={(event) => onChange("salaryMin", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobs-salary-max">Maximum salary</Label>
            <Input
              id="jobs-salary-max"
              type="number"
              min={0}
              inputMode="numeric"
              value={values.salaryMax}
              disabled={salaryInputsDisabled}
              aria-invalid={Boolean(salaryRangeError)}
              placeholder="No maximum"
              onChange={(event) => onChange("salaryMax", event.target.value)}
            />
          </div>
          {salaryRangeError && (
            <p
              id="jobs-salary-error"
              className="text-sm text-destructive sm:col-span-3"
              role="alert"
            >
              {salaryRangeError}
            </p>
          )}
        </fieldset>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active
          </span>
          {activeFilters.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 max-w-full gap-1.5 rounded-full bg-background"
              aria-label={`Remove ${filter.label} filter`}
              onClick={() => onChange(filter.key, "")}
            >
              <span className="truncate">{filter.label}</span>
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={onClearAll}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
