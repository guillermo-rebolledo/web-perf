import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteForm } from "@/components/site-form";

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

describe("SiteForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the Create Site trigger button", () => {
    render(<SiteForm />);
    expect(
      screen.getByRole("button", { name: /create site/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<SiteForm />);

    await user.click(screen.getByRole("button", { name: /create site/i }));

    expect(screen.getByText("Monitor New Site")).toBeInTheDocument();
    expect(screen.getByLabelText(/site name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(<SiteForm />);

    await user.click(screen.getByRole("button", { name: /create site/i }));

    // Submit without filling fields
    const submitButtons = screen.getAllByRole("button", {
      name: /create site/i,
    });
    const submitButton = submitButtons[submitButtons.length - 1];
    await user.click(submitButton);

    await expect(screen.findByText(/name is required/i)).resolves.toBeInTheDocument();
  });

  it("submits the form and calls the API", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "new-site",
          name: "Test",
          url: "https://example.com",
        }),
    });

    render(<SiteForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: /create site/i }));

    await user.type(screen.getByLabelText(/site name/i), "Test");
    await user.type(screen.getByLabelText(/url/i), "https://example.com");

    const submitButtons = screen.getAllByRole("button", {
      name: /create site/i,
    });
    const submitButton = submitButtons[submitButtons.length - 1];
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  it("shows API error on failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Site with this URL already exists" }),
    });

    render(<SiteForm />);

    await user.click(screen.getByRole("button", { name: /create site/i }));
    await user.type(screen.getByLabelText(/site name/i), "Test");
    await user.type(screen.getByLabelText(/url/i), "https://example.com");

    const submitButtons = screen.getAllByRole("button", {
      name: /create site/i,
    });
    const submitButton = submitButtons[submitButtons.length - 1];
    await user.click(submitButton);

    await expect(screen.findByText(/already exists/i)).resolves.toBeInTheDocument();
  });
});
