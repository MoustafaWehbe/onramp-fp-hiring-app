import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applicationKeys,
  useUpdateApplicationStage,
} from "@/features/applications/hooks";
import type { RecruiterPipelineApplication } from "@/types/applications";

const { updateApplicationStage } = vi.hoisted(() => ({
  updateApplicationStage: vi.fn(),
}));

vi.mock("@/features/applications/api", () => ({
  updateApplicationStage,
}));

const application = {
  id: "application-amara",
  jobId: "job-1",
  stage: "APPLIED",
  candidateProfile: { user: { name: "Amara Okafor" } },
} as unknown as RecruiterPipelineApplication;

function harness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(applicationKeys.byJob("job-1"), [application]);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

function stageInCache(queryClient: QueryClient): string | undefined {
  return queryClient.getQueryData<RecruiterPipelineApplication[]>(
    applicationKeys.byJob("job-1"),
  )?.[0]?.stage;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateApplicationStage", () => {
  it("moves the card immediately, before the server answers", async () => {
    const { queryClient, wrapper } = harness();
    let resolveRequest: (value: unknown) => void = () => undefined;
    updateApplicationStage.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useUpdateApplicationStage(), {
      wrapper,
    });

    result.current.mutate({
      applicationId: application.id,
      jobId: "job-1",
      stage: "INTERVIEWING",
    });

    // The drop must land in the new column without waiting for the round trip.
    await waitFor(() => {
      expect(stageInCache(queryClient)).toBe("INTERVIEWING");
    });

    resolveRequest({ ...application, stage: "INTERVIEWING" });
  });

  it("puts the card back when the server rejects the move", async () => {
    const { queryClient, wrapper } = harness();
    updateApplicationStage.mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: {
          status: 422,
          data: { error: "A candidate can't be moved back to applied." },
        },
      }),
    );

    const { result } = renderHook(() => useUpdateApplicationStage(), {
      wrapper,
    });

    result.current.mutate({
      applicationId: application.id,
      jobId: "job-1",
      stage: "OFFER",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Rolled back to the last state the server actually confirmed.
    expect(stageInCache(queryClient)).toBe("APPLIED");
  });

  it("leaves other candidates untouched while one card moves", async () => {
    const { queryClient, wrapper } = harness();
    const second = {
      ...application,
      id: "application-jordan",
      stage: "REVIEWED",
    } as RecruiterPipelineApplication;
    queryClient.setQueryData(applicationKeys.byJob("job-1"), [
      application,
      second,
    ]);
    updateApplicationStage.mockResolvedValue({
      ...application,
      stage: "OFFER",
    });

    const { result } = renderHook(() => useUpdateApplicationStage(), {
      wrapper,
    });

    result.current.mutate({
      applicationId: application.id,
      jobId: "job-1",
      stage: "OFFER",
    });

    await waitFor(() => {
      expect(stageInCache(queryClient)).toBe("OFFER");
    });

    const cached = queryClient.getQueryData<RecruiterPipelineApplication[]>(
      applicationKeys.byJob("job-1"),
    );
    expect(cached?.[1].stage).toBe("REVIEWED");
  });
});
