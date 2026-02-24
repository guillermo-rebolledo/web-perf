import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertCard, type RegressionAlertWithDetails } from "../alert-card";

const mockAlert: RegressionAlertWithDetails = {
  id: "alert-1",
  metricName: "lcp",
  baselineValue: 2000,
  actualValue: 3500,
  delta: 1500,
  percentChange: 75,
  severity: "critical",
  confidence: "high",
  status: "open",
  createdAt: new Date("2024-01-15T10:30:00Z"),
  run: {
    id: "run-1",
    completedAt: new Date("2024-01-15T10:30:00Z"),
    monitor: {
      id: "monitor-1",
      site: {
        id: "site-1",
        name: "Example Site",
        url: "https://example.com",
      },
    },
  },
};

describe("AlertCard", () => {
  it("renders site name and URL", () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText("Example Site")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("renders metric name in uppercase", () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText("LCP")).toBeInTheDocument();
  });

  it("renders regression delta with correct formatting", () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText(/\+1500ms/)).toBeInTheDocument();
    expect(screen.getByText(/\+75\.0%/)).toBeInTheDocument();
  });

  it("renders critical severity badge", () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText("Critical Severity")).toBeInTheDocument();
  });

  it("renders high confidence badge", () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText("High Confidence")).toBeInTheDocument();
  });

  it("formats CLS metric correctly", () => {
    const clsAlert = {
      ...mockAlert,
      metricName: "cls",
      baselineValue: 0.1,
      actualValue: 0.25,
      delta: 0.15,
      percentChange: 150,
    };

    render(<AlertCard alert={clsAlert} />);
    expect(screen.getByText("CLS")).toBeInTheDocument();
    // Delta should be formatted with 3 decimals and no unit
    expect(screen.getByText(/\+0\.150/)).toBeInTheDocument();
  });

  it("renders moderate severity correctly", () => {
    const moderateAlert = {
      ...mockAlert,
      severity: "moderate",
    };

    render(<AlertCard alert={moderateAlert} />);
    expect(screen.getByText("Moderate Severity")).toBeInTheDocument();
  });

  it("renders medium confidence correctly", () => {
    const mediumConfidenceAlert = {
      ...mockAlert,
      confidence: "medium",
    };

    render(<AlertCard alert={mediumConfidenceAlert} />);
    expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
  });

  it("renders created date", () => {
    render(<AlertCard alert={mockAlert} />);
    // The date is formatted as relative time (e.g., "2 years ago")
    expect(screen.getByText(/ago$/)).toBeInTheDocument();
  });

  it("renders as a link to regression details", () => {
    const { container } = render(<AlertCard alert={mockAlert} />);
    const link = container.querySelector('a[href="/runs/run-1/regressions/alert-1"]');
    expect(link).toBeInTheDocument();
  });

  it("handles invalid severity gracefully with fallback", () => {
    const invalidAlert = {
      ...mockAlert,
      severity: "unknown",
    };

    render(<AlertCard alert={invalidAlert} />);
    // Should fallback to "Minor" based on getSeverityInfo
    expect(screen.getByText("Minor Severity")).toBeInTheDocument();
  });

  it("handles invalid confidence gracefully with fallback", () => {
    const invalidAlert = {
      ...mockAlert,
      confidence: "unknown",
    };

    render(<AlertCard alert={invalidAlert} />);
    // Should fallback to "Low" based on getConfidenceInfo
    expect(screen.getByText("Low Confidence")).toBeInTheDocument();
  });
});
