import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CliAuthorizeForm } from "../form";

// Mock the server action
vi.mock("../actions", () => ({
  authorizeCliLogin: vi.fn(),
}));

import { authorizeCliLogin } from "../actions";

const mockAuthorize = vi.mocked(authorizeCliLogin);

describe("CliAuthorizeForm", () => {
  beforeEach(() => {
    mockAuthorize.mockReset();
  });

  describe("idle state", () => {
    it("shows the user email", () => {
      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    it("shows the Authorize CLI button", () => {
      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      expect(screen.getByRole("button", { name: /Authorize CLI/ })).toBeInTheDocument();
    });

    it("shows the Cancel link", () => {
      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows 'Authorizing…' and disables the button while request is in flight", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockReturnValueOnce(new Promise(() => {})); // never resolves

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      expect(screen.getByRole("button", { name: /Authorizing/ })).toBeDisabled();
    });
  });

  describe("success state", () => {
    it("shows 'CLI authorized' heading with the user email", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: true, email: "user@example.com" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText("CLI authorized")).toBeInTheDocument();
      });
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    it("prompts the user to close the tab", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: true, email: "user@example.com" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText(/close this tab/)).toBeInTheDocument();
      });
    });
  });

  describe("error states", () => {
    it("shows 'Code expired' message for expired reason", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "expired" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText("Code expired")).toBeInTheDocument();
      });
    });

    it("shows 'Already authorized' message for already_used reason", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "already_used" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText("Already authorized")).toBeInTheDocument();
      });
    });

    it("shows 'Session expired' message for unauthenticated reason", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "unauthenticated" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText("Session expired")).toBeInTheDocument();
      });
    });

    it("shows 'Something went wrong' and a Try again button for server_error", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "server_error" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
    });

    it("returns to idle when 'Try again' is clicked after server_error", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "server_error" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => screen.getByRole("button", { name: /Try again/ }));
      await user.click(screen.getByRole("button", { name: /Try again/ }));

      expect(screen.getByRole("button", { name: /Authorize CLI/ })).toBeInTheDocument();
    });

    it("does not show Try again button for non-server-error reasons", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: false, reason: "expired" });

      render(<CliAuthorizeForm code="abc123" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      await waitFor(() => screen.getByText("Code expired"));
      expect(screen.queryByRole("button", { name: /Try again/ })).not.toBeInTheDocument();
    });
  });

  describe("passes the code to the server action", () => {
    it("calls authorizeCliLogin with the provided code", async () => {
      const user = userEvent.setup();
      mockAuthorize.mockResolvedValueOnce({ ok: true, email: "user@example.com" });

      render(<CliAuthorizeForm code="my-secret-code" email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: /Authorize CLI/ }));

      expect(mockAuthorize).toHaveBeenCalledWith("my-secret-code");
    });
  });
});
