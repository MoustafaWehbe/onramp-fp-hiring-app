import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationPercentile } from "@/features/applications/components/ApplicationPercentile";

describe("ApplicationPercentile", () => {
  it("renders nothing before a computation has been triggered", () => {
    const { container } = render(
      <ApplicationPercentile isPending={false} percentile={undefined} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading state while the score is being computed", () => {
    render(<ApplicationPercentile isPending percentile={undefined} />);

    expect(
      screen.getByText("Calculating how you compare to other applicants…"),
    ).toBeInTheDocument();
  });

  it("shows the percentile message once resolved", () => {
    render(<ApplicationPercentile isPending={false} percentile={20} />);

    expect(
      screen.getByText(/in the top 20% of applicants for this job\./),
    ).toBeInTheDocument();
  });

  it("renders nothing when resolved with no percentile available", () => {
    const { container } = render(
      <ApplicationPercentile isPending={false} percentile={undefined} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
