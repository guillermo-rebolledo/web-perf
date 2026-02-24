import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyAlerts } from "../empty-alerts";

describe("EmptyAlerts", () => {
  it("renders the empty state message", () => {
    render(<EmptyAlerts days={1} />);
    expect(screen.getByText("No Alerts Found")).toBeInTheDocument();
  });

  it("renders singular day message for 1 day", () => {
    render(<EmptyAlerts days={1} />);
    expect(
      screen.getByText("No regression alerts detected in the last 1 day")
    ).toBeInTheDocument();
  });

  it("renders plural days message for multiple days", () => {
    render(<EmptyAlerts days={7} />);
    expect(
      screen.getByText("No regression alerts detected in the last 7 days")
    ).toBeInTheDocument();
  });

  it("renders correct message for 30 days", () => {
    render(<EmptyAlerts days={30} />);
    expect(
      screen.getByText("No regression alerts detected in the last 30 days")
    ).toBeInTheDocument();
  });

  it("renders the alert icon", () => {
    const { container } = render(<EmptyAlerts days={5} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
