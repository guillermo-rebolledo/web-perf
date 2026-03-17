import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityEventCard } from "../activity-event-card";
import type { ActivityEventRow } from "@/types/api";

function createEvent(overrides: Partial<ActivityEventRow> = {}): ActivityEventRow {
  return {
    id: "event-1",
    type: "run_completed",
    entityId: "run-1",
    entityType: "run",
    metadata: {
      type: "run_completed",
      siteName: "My Site",
      siteUrl: "https://example.com",
      siteId: "site-1",
      monitorId: "monitor-1",
      performanceScore: 92,
    },
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    ...overrides,
  };
}

describe("ActivityEventCard", () => {
  it("renders run_completed event description", () => {
    render(<ActivityEventCard event={createEvent()} />);
    expect(screen.getByText(/Audit completed for "My Site" — score 92/)).toBeInTheDocument();
  });

  it("renders site_created event description", () => {
    render(
      <ActivityEventCard
        event={createEvent({
          type: "site_created",
          entityType: "site",
          metadata: { type: "site_created", siteName: "New Site", siteUrl: "https://new.com" },
        })}
      />
    );
    expect(screen.getByText(/Site "New Site" was added/)).toBeInTheDocument();
  });

  it("renders monitor_created event description", () => {
    render(
      <ActivityEventCard
        event={createEvent({
          type: "monitor_created",
          entityType: "monitor",
          metadata: {
            type: "monitor_created",
            siteName: "My Site",
            siteUrl: "https://example.com",
            siteId: "site-1",
            strategy: "mobile",
            triggerType: "schedule",
          },
        })}
      />
    );
    expect(screen.getByText(/Monitor created for "My Site" — mobile \/ schedule/)).toBeInTheDocument();
  });

  it("renders run_failed event description", () => {
    render(
      <ActivityEventCard
        event={createEvent({
          type: "run_failed",
          metadata: {
            type: "run_failed",
            siteName: "My Site",
            siteUrl: "https://example.com",
            siteId: "site-1",
            monitorId: "monitor-1",
            errorMessage: "Timeout",
          },
        })}
      />
    );
    expect(screen.getByText(/Audit failed for "My Site": Timeout/)).toBeInTheDocument();
  });

  it("renders regression_detected event description", () => {
    render(
      <ActivityEventCard
        event={createEvent({
          type: "regression_detected",
          metadata: {
            type: "regression_detected",
            siteName: "My Site",
            siteUrl: "https://example.com",
            siteId: "site-1",
            alertCount: 3,
            severities: ["critical", "moderate", "minor"],
          },
        })}
      />
    );
    expect(screen.getByText(/3 regressions detected on "My Site"/)).toBeInTheDocument();
  });

  it("renders deployment_run_triggered event description", () => {
    render(
      <ActivityEventCard
        event={createEvent({
          type: "deployment_run_triggered",
          metadata: {
            type: "deployment_run_triggered",
            siteName: "My Site",
            siteUrl: "https://example.com",
            siteId: "site-1",
            monitorId: "monitor-1",
            githubRepo: "owner/repo",
            githubBranch: "main",
          },
        })}
      />
    );
    expect(screen.getByText(/Deployment audit triggered for "My Site" \(main\)/)).toBeInTheDocument();
  });

  it("links run events to /runs/:id", () => {
    const { container } = render(<ActivityEventCard event={createEvent()} />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/runs/run-1");
  });

  it("links site events to /sites/:id", () => {
    const { container } = render(
      <ActivityEventCard
        event={createEvent({
          type: "site_created",
          entityType: "site",
          metadata: { type: "site_created", siteName: "My Site", siteUrl: "https://example.com" },
        })}
      />
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/sites/run-1");
  });

  it("shows relative time", () => {
    render(<ActivityEventCard event={createEvent()} />);
    // 5 minutes ago
    expect(screen.getByText("5m ago")).toBeInTheDocument();
  });

  it("shows 'just now' for very recent events", () => {
    render(
      <ActivityEventCard
        event={createEvent({ createdAt: new Date().toISOString() })}
      />
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
  });
});
