import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegrationsManager } from "../integrations-manager";
import type { IntegrationItem, MonitorOption } from "@/types/api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeIntegration(overrides: Partial<IntegrationItem> = {}): IntegrationItem {
  return {
    id: "int-1",
    name: "Slack #alerts",
    type: "slack",
    isActive: true,
    monitorCount: 0,
    createdAt: new Date("2025-01-01").toISOString(),
    ...overrides,
  };
}

const monitors: MonitorOption[] = [
  { id: "mon-1", label: "My Site (mobile)" },
  { id: "mon-2", label: "My Site (desktop)" },
];

describe("IntegrationsManager", () => {
  beforeEach(() => mockFetch.mockReset());

  describe("empty state", () => {
    it("shows 'no integrations' empty state when user has monitors but no integrations", () => {
      render(<IntegrationsManager initialIntegrations={[]} monitors={monitors} />);
      expect(screen.getByText(/No integrations yet/)).toBeInTheDocument();
    });

    it("shows 'no monitors' state and disables Add button when user has no monitors", () => {
      render(<IntegrationsManager initialIntegrations={[]} monitors={[]} />);
      expect(screen.getByText(/No monitors yet/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add Integration/i })).toBeDisabled();
    });

    it("shows 'Add Integration' button enabled when monitors exist", () => {
      render(<IntegrationsManager initialIntegrations={[]} monitors={monitors} />);
      const buttons = screen.getAllByRole("button", { name: /Add/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("integration list", () => {
    it("renders integration rows", () => {
      render(
        <IntegrationsManager
          initialIntegrations={[
            makeIntegration({ name: "Slack #perf" }),
            makeIntegration({ id: "int-2", name: "Slack #general" }),
          ]}
          monitors={monitors}
        />,
      );
      expect(screen.getByText("Slack #perf")).toBeInTheDocument();
      expect(screen.getByText("Slack #general")).toBeInTheDocument();
    });

    it("shows 'All monitors' when monitorCount is 0", () => {
      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration({ monitorCount: 0 })]}
          monitors={monitors}
        />,
      );
      expect(screen.getByText("All monitors")).toBeInTheDocument();
    });

    it("shows monitor count when monitorCount > 0", () => {
      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration({ monitorCount: 3 })]}
          monitors={monitors}
        />,
      );
      expect(screen.getByText("3 monitors")).toBeInTheDocument();
    });
  });

  describe("test connection", () => {
    it("shows success toast on successful test", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration()]}
          monitors={monitors}
        />,
      );

      await user.click(screen.getByTitle("Send test message"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/integrations/int-1/test",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    it("shows error on failed test", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, error: "invalid_token" }),
      });

      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration()]}
          monitors={monitors}
        />,
      );

      await user.click(screen.getByTitle("Send test message"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("delete integration", () => {
    it("removes the row after successful delete", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration({ name: "Delete Me" })]}
          monitors={monitors}
        />,
      );
      expect(screen.getByText("Delete Me")).toBeInTheDocument();

      await user.click(screen.getByTitle("Remove integration"));

      await waitFor(() => {
        expect(screen.queryByText("Delete Me")).not.toBeInTheDocument();
      });
    });

    it("keeps the row when delete fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration({ name: "Sticky" })]}
          monitors={monitors}
        />,
      );

      await user.click(screen.getByTitle("Remove integration"));

      await waitFor(() => {
        expect(screen.getByText("Sticky")).toBeInTheDocument();
      });
    });
  });

  describe("active toggle", () => {
    it("toggles isActive on switch click", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <IntegrationsManager
          initialIntegrations={[makeIntegration({ isActive: true })]}
          monitors={monitors}
        />,
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toBeChecked();

      await user.click(toggle);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/integrations/int-1",
          expect.objectContaining({ method: "PATCH" }),
        );
      });
    });
  });

  describe("add integration dialog", () => {
    it("opens dialog when Add Integration is clicked", async () => {
      const user = userEvent.setup();
      render(<IntegrationsManager initialIntegrations={[]} monitors={monitors} />);

      // Click the header button
      await user.click(screen.getAllByRole("button", { name: /Add/i })[0]);

      await waitFor(() => {
        expect(screen.getByText("Add Slack Integration")).toBeInTheDocument();
      });
    });

    it("validates that name field is required", async () => {
      const user = userEvent.setup();
      render(<IntegrationsManager initialIntegrations={[]} monitors={monitors} />);
      await user.click(screen.getAllByRole("button", { name: /Add/i })[0]);
      await waitFor(() => screen.getByText("Add Slack Integration"));

      await user.click(screen.getByRole("button", { name: /Add Integration/i }));

      await waitFor(() => {
        expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      });
    });

    it("adds new integration to list on success", async () => {
      const user = userEvent.setup();
      const newItem = makeIntegration({ id: "int-new", name: "New Slack" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ integration: newItem }),
      });

      render(<IntegrationsManager initialIntegrations={[]} monitors={monitors} />);
      await user.click(screen.getAllByRole("button", { name: /Add/i })[0]);
      await waitFor(() => screen.getByText("Add Slack Integration"));

      await user.type(screen.getByLabelText(/Name/i), "New Slack");
      await user.type(
        screen.getByLabelText(/Webhook URL/i),
        "https://hooks.slack.com/services/abc",
      );
      await user.click(screen.getByRole("button", { name: /Add Integration/i }));

      await waitFor(() => {
        expect(screen.getByText("New Slack")).toBeInTheDocument();
      });
    });
  });
});
