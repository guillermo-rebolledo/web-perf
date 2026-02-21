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

  it("opens dialog with form fields when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<MonitorForm siteId="site-1" />);

    await user.click(screen.getByRole("button", { name: /create monitor/i }));

    expect(
      screen.getByRole("heading", { name: /configure audit monitor/i }),
    ).toBeInTheDocument();
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

    // Mobile is the default
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

  it("submits form with correct payload", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "monitor-1" }),
    });

    render(<MonitorForm siteId="site-1" onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: /create monitor/i }));

    // Use defaults (mobile, 1440, active) and submit
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
