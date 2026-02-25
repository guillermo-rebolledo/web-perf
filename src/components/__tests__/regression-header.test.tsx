import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegressionHeader } from "../regression-header";

describe("RegressionHeader", () => {
  const defaultProps = {
    metricName: "lcp",
    severity: "critical",
    confidence: "high",
    baselineValue: 2000,
    actualValue: 3500,
    delta: 1500,
    percentChange: 75,
  };

  it("renders metric name in uppercase", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText(/LCP Regression Detected/)).toBeInTheDocument();
  });

  it("renders baseline value with correct unit", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.getByText("Baseline")).toBeInTheDocument();
  });

  it("renders current value with correct unit", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText("3500")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });

  it("renders regression delta and percentage", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText(/1500/)).toBeInTheDocument();
    expect(screen.getByText(/75\.0%/)).toBeInTheDocument();
  });

  it("renders severity badge", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText("Critical Severity")).toBeInTheDocument();
  });

  it("renders confidence badge with 'Confidence' suffix", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(screen.getByText("High Confidence")).toBeInTheDocument();
  });

  it("formats CLS values correctly", () => {
    const clsProps = {
      ...defaultProps,
      metricName: "cls",
      baselineValue: 0.1,
      actualValue: 0.25,
      delta: 0.15,
      percentChange: 150,
    };

    render(<RegressionHeader {...clsProps} />);
    expect(screen.getByText(/CLS Regression Detected/)).toBeInTheDocument();
    expect(screen.getByText(/0\.100/)).toBeInTheDocument();
    expect(screen.getByText(/0\.250/)).toBeInTheDocument();
    expect(screen.getByText(/0\.150/)).toBeInTheDocument();
  });

  it("renders ms unit for time-based metrics", () => {
    render(<RegressionHeader {...defaultProps} />);
    // Should have multiple "ms" text nodes for baseline, current, and delta
    const msTexts = screen.getAllByText("ms");
    expect(msTexts.length).toBeGreaterThan(0);
  });

  it("does not render unit for CLS", () => {
    const clsProps = {
      ...defaultProps,
      metricName: "cls",
      baselineValue: 0.1,
      actualValue: 0.25,
      delta: 0.15,
    };

    render(<RegressionHeader {...clsProps} />);
    expect(screen.queryByText("ms")).not.toBeInTheDocument();
  });

  it("renders moderate severity correctly", () => {
    const moderateProps = { ...defaultProps, severity: "moderate" };
    render(<RegressionHeader {...moderateProps} />);
    expect(screen.getByText("Moderate Severity")).toBeInTheDocument();
  });

  it("renders medium confidence correctly", () => {
    const mediumProps = { ...defaultProps, confidence: "medium" };
    render(<RegressionHeader {...mediumProps} />);
    expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
  });

  it("renders low confidence correctly", () => {
    const lowProps = { ...defaultProps, confidence: "low" };
    render(<RegressionHeader {...lowProps} />);
    expect(screen.getByText("Low Confidence")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<RegressionHeader {...defaultProps} />);
    expect(
      screen.getByText("Performance degradation analysis and root cause investigation")
    ).toBeInTheDocument();
  });

  it("handles zero values correctly", () => {
    const zeroProps = {
      ...defaultProps,
      baselineValue: 0,
      actualValue: 1500,
      delta: 1500,
      percentChange: Infinity,
    };

    render(<RegressionHeader {...zeroProps} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
