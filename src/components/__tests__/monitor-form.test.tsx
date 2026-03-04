import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitorForm } from "@/components/monitor-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// posthog is imported in the component
vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

describe("MonitorForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the Create Monitor trigger button", () => {
    render(<MonitorForm siteId="site-1" />);
    expect(
      screen.getByRole("button", { name: /create monitor/i }),
    ).toBeInTheDocument();
  });

  it("renders a custom trigger button when provided", () => {
    render(
      <MonitorForm
        siteId="site-1"
        triggerButton={<button>Add Monitor</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: /add monitor/i }),
    ).toBeInTheDocument();
  });

  it("opens dialog with trigger type selector when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<MonitorForm siteId="site-1" />);

    await user.click(screen.getByRole("button", { name: /create monitor/i }));

    expect(
      screen.getByRole("heading", { name: /configure audit monitor/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Trigger Type")).toBeInTheDocument();
    expect(screen.getByText("On a Schedule")).toBeInTheDocument();
    expect(screen.getByText("On Deployment")).toBeInTheDocument();
  });

  describe("Schedule path (default)", () => {
    it("shows schedule fields by default", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      expect(screen.getByText("Scan Frequency")).toBeInTheDocument();
      expect(screen.getByText("Audit Strategy")).toBeInTheDocument();
      expect(screen.getByText("Mobile")).toBeInTheDocument();
      expect(screen.getByText("Desktop")).toBeInTheDocument();
    });

    it("shows both strategy radio cards with descriptions", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      expect(
        screen.getByText("Test with a simulated mobile device"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Test with a desktop viewport"),
      ).toBeInTheDocument();
    });

    it("selects desktop strategy when its card is clicked", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      const desktopRadio = screen.getByRole("radio", { name: /desktop/i });
      const mobileRadio = screen.getByRole("radio", { name: /mobile/i });

      expect(mobileRadio).toBeChecked();
      expect(desktopRadio).not.toBeChecked();

      await user.click(desktopRadio);

      expect(desktopRadio).toBeChecked();
      expect(mobileRadio).not.toBeChecked();
    });

    it("shows info banner with default options", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      expect(
        screen.getByText(/runs immediately after creation/),
      ).toBeInTheDocument();
      expect(screen.getByText("mobile")).toBeInTheDocument();
      expect(screen.getByText("24 hours")).toBeInTheDocument();
    });

    it("shows paused banner when Active is toggled off", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      const activeSwitch = screen.getByRole("switch");
      await user.click(activeSwitch);

      expect(
        screen.getByText(/no scans will run until activated/i),
      ).toBeInTheDocument();
    });

    it("submits form with correct schedule payload", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "monitor-1" }),
      });

      render(<MonitorForm siteId="site-1" onSuccess={onSuccess} />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      const submitButtons = screen.getAllByRole("button", {
        name: /create monitor/i,
      });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/monitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: "site-1",
            triggerType: "schedule",
            cadenceMinutes: 1440,
            strategy: "mobile",
            isActive: true,
          }),
        });
      });

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("shows API error on failure", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: "Monitor already exists for this site" }),
      });

      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));

      const submitButtons = screen.getAllByRole("button", {
        name: /create monitor/i,
      });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await expect(
        screen.findByText(/monitor already exists/i),
      ).resolves.toBeInTheDocument();
    });
  });

  describe("Deployment path", () => {
    it("shows branch/repo fields when On Deployment is selected, hides cadence", async () => {
      const user = userEvent.setup();
      render(<MonitorForm siteId="site-1" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));
      await user.click(screen.getByText("On Deployment"));

      // Cadence should be hidden
      expect(screen.queryByText("Scan Frequency")).not.toBeInTheDocument();

      // Branch and repo should be visible
      expect(screen.getByLabelText(/branch/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("owner/repo")).toBeInTheDocument();
    });

    it("submits deployment monitor with triggerType=deployment and shows setup view", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "monitor-deploy-1",
            webhookSecret: "test-secret-hex",
            triggerType: "deployment",
          }),
      });

      render(<MonitorForm siteId="site-1" baseUrl="https://app.example.com" />);

      await user.click(screen.getByRole("button", { name: /create monitor/i }));
      await user.click(screen.getByText("On Deployment"));

      const submitButtons = screen.getAllByRole("button", {
        name: /create monitor/i,
      });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/monitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"triggerType":"deployment"'),
        });
      });

      // Should show the setup view with the secret
      await vi.waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /deployment monitor created/i }),
        ).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("test-secret-hex")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://app.example.com/api/webhooks/github/monitor-deploy-1"),
      ).toBeInTheDocument();
    });
  });
});
