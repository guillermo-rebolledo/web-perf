import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge, MetricBadge } from "@/components/score-badge";

describe("ScoreBadge", () => {
  it("renders N/A for null score", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders the rounded score", () => {
    render(<ScoreBadge score={85.7} />);
    expect(screen.getByText("86")).toBeInTheDocument();
  });

  it("renders score of 0", () => {
    render(<ScoreBadge score={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders score of 100", () => {
    render(<ScoreBadge score={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});

describe("MetricBadge", () => {
  it("renders N/A for null value", () => {
    render(<MetricBadge label="LCP" value={null} unit="ms" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("LCP")).toBeInTheDocument();
  });

  it("renders N/A for undefined value", () => {
    render(<MetricBadge label="LCP" value={undefined} unit="ms" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders ms values rounded", () => {
    render(<MetricBadge label="LCP" value={2543.7} unit="ms" />);
    expect(screen.getByText("2544ms")).toBeInTheDocument();
  });

  it("renders unitless values with 3 decimal places", () => {
    render(<MetricBadge label="CLS" value={0.1} unit="" />);
    expect(screen.getByText("0.100")).toBeInTheDocument();
  });

  it("renders the label", () => {
    render(<MetricBadge label="FCP" value={1800} unit="ms" />);
    expect(screen.getByText("FCP")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <MetricBadge
        label="LCP"
        description="Largest Contentful Paint"
        value={2500}
        unit="ms"
      />
    );
    expect(screen.getByText("Largest Contentful Paint")).toBeInTheDocument();
  });
});
