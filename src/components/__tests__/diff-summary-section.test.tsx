import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffSummarySection } from "../diff-summary-section";
import type { DiffSummary } from "@/lib/alert-utils";

const mockDiffSummary: DiffSummary = {
  network: {
    totalBytesDelta: 150000,
    requestCountDelta: 5,
    imageBytesDelta: 50000,
    jsBytesDelta: 100000,
    cssBytesDelta: 10000,
    fontBytesDelta: 5000,
    thirdPartyBytesDelta: 75000,
    newDomains: ["cdn.example.com", "analytics.example.com"],
    removedDomains: [],
  },
  mainThread: {
    scriptingTimeDelta: 250,
    renderingTimeDelta: 100,
    longTaskCountDelta: 2,
    totalMainThreadTimeDelta: 350,
  },
  rendering: {
    lcpResourceChanged: true,
    lcpResourceBefore: "/images/old-hero.jpg",
    lcpResourceAfter: "/images/new-hero.jpg",
    clsShiftSourcesChanged: false,
  },
  backend: {
    ttfbDelta: 150,
    serverLatencyDelta: 120,
  },
};

describe("DiffSummarySection", () => {
  it("renders section title and description", () => {
    render(<DiffSummarySection diffSummary={mockDiffSummary} />);
    expect(screen.getByText("Performance Changes")).toBeInTheDocument();
  });

  describe("Network section", () => {
    it("renders network card title", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Network")).toBeInTheDocument();
    });

    it("displays total bytes delta in KB", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText(/\+146\.5 KB/)).toBeInTheDocument();
    });

    it("displays request count delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("displays JavaScript bytes delta in KB", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText(/\+97\.7 KB/)).toBeInTheDocument();
    });

    it("displays new domains when present", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("New Domains:")).toBeInTheDocument();
      expect(screen.getByText(/cdn\.example\.com/)).toBeInTheDocument();
      expect(screen.getByText(/analytics\.example\.com/)).toBeInTheDocument();
    });

    it("does not display new domains section when empty", () => {
      const summaryWithoutDomains = {
        ...mockDiffSummary,
        network: { ...mockDiffSummary.network, newDomains: [] },
      };

      render(<DiffSummarySection diffSummary={summaryWithoutDomains} />);
      expect(screen.queryByText("New Domains:")).not.toBeInTheDocument();
    });
  });

  describe("Main Thread section", () => {
    it("renders main thread card title", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Main Thread")).toBeInTheDocument();
    });

    it("displays total work delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("+350 ms")).toBeInTheDocument();
    });

    it("displays scripting time delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("+250 ms")).toBeInTheDocument();
    });

    it("displays long tasks delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  describe("Rendering section", () => {
    it("renders rendering card title", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Rendering")).toBeInTheDocument();
    });

    it("displays LCP resource changed status", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("LCP Resource Changed:")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("displays before and after LCP resources when changed", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Before:")).toBeInTheDocument();
      expect(screen.getByText("/images/old-hero.jpg")).toBeInTheDocument();
      expect(screen.getByText("After:")).toBeInTheDocument();
      expect(screen.getByText("/images/new-hero.jpg")).toBeInTheDocument();
    });

    it("does not display LCP resources when not changed", () => {
      const summaryWithoutLcpChange = {
        ...mockDiffSummary,
        rendering: {
          ...mockDiffSummary.rendering,
          lcpResourceChanged: false,
        },
      };

      render(<DiffSummarySection diffSummary={summaryWithoutLcpChange} />);
      expect(screen.getByText("No")).toBeInTheDocument();
      expect(screen.queryByText("Before:")).not.toBeInTheDocument();
    });
  });

  describe("Backend section", () => {
    it("renders backend card title", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Backend")).toBeInTheDocument();
    });

    it("displays TTFB delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("TTFB:")).toBeInTheDocument();
      expect(screen.getByText("+150 ms")).toBeInTheDocument();
    });

    it("displays server latency delta", () => {
      render(<DiffSummarySection diffSummary={mockDiffSummary} />);
      expect(screen.getByText("Server Latency:")).toBeInTheDocument();
      expect(screen.getByText("+120 ms")).toBeInTheDocument();
    });
  });

  describe("Negative deltas", () => {
    it("handles negative deltas correctly", () => {
      const summaryWithNegativeDeltas: DiffSummary = {
        network: {
          ...mockDiffSummary.network,
          totalBytesDelta: -50000,
          requestCountDelta: -2,
        },
        mainThread: {
          ...mockDiffSummary.mainThread,
          totalMainThreadTimeDelta: -100,
        },
        rendering: mockDiffSummary.rendering,
        backend: {
          ttfbDelta: -50,
          serverLatencyDelta: -30,
        },
      };

      render(<DiffSummarySection diffSummary={summaryWithNegativeDeltas} />);
      expect(screen.getByText(/-48\.8 KB/)).toBeInTheDocument();
      expect(screen.getByText("-2")).toBeInTheDocument();
      expect(screen.getByText("-100 ms")).toBeInTheDocument();
      expect(screen.getByText("-50 ms")).toBeInTheDocument();
    });
  });
});
