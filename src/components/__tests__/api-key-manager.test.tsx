import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyManager } from "../api-key-manager";
import type { ApiKeyItem } from "@/types/api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeKey(overrides: Partial<ApiKeyItem> = {}): ApiKeyItem {
  return {
    id: "key-1",
    name: "Test Key",
    keyPrefix: "wpl_test_abcde",
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date("2025-01-01").toISOString(),
    userAgent: null,
    ...overrides,
  };
}

const RAW_KEY = "wpl_test_abc1234567890123456789012";

describe("ApiKeyManager", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("empty state", () => {
    it("shows empty state message when no keys exist", () => {
      render(<ApiKeyManager initialKeys={[]} />);
      expect(screen.getByText(/No API keys yet/)).toBeInTheDocument();
    });
  });

  describe("key list", () => {
    it("renders all provided keys", () => {
      const keys = [
        makeKey({ id: "k1", name: "CI Key" }),
        makeKey({ id: "k2", name: "Local Dev" }),
      ];
      render(<ApiKeyManager initialKeys={keys} />);
      expect(screen.getByText("CI Key")).toBeInTheDocument();
      expect(screen.getByText("Local Dev")).toBeInTheDocument();
    });

    it("shows key prefix in a code element", () => {
      render(<ApiKeyManager initialKeys={[makeKey({ keyPrefix: "wpl_test_xyz99" })]} />);
      expect(screen.getByText(/wpl_test_xyz99/)).toBeInTheDocument();
    });

    it("shows 'Never' for lastUsedAt when null", () => {
      render(<ApiKeyManager initialKeys={[makeKey({ lastUsedAt: null })]} />);
      expect(screen.getAllByText("Never").length).toBeGreaterThan(0);
    });

    it("parses and displays user agent under the key name", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      render(<ApiKeyManager initialKeys={[makeKey({ name: "Browser Key", userAgent: ua })]} />);
      expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    });
  });

  describe("key creation", () => {
    it("Generate Key button is disabled when the name field is empty", () => {
      render(<ApiKeyManager initialKeys={[]} />);
      expect(screen.getByRole("button", { name: /Generate Key/ })).toBeDisabled();
    });

    it("Generate Key button enables when name is typed", async () => {
      const user = userEvent.setup();
      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "My Key");
      expect(screen.getByRole("button", { name: /Generate Key/ })).toBeEnabled();
    });

    it("shows 'API Key Created' dialog on success", async () => {
      const user = userEvent.setup();
      const newKey = makeKey({ id: "k-new", name: "My Key" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: newKey, rawKey: RAW_KEY }),
      });

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "My Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });
    });

    it("masks the raw key by default in the dialog", async () => {
      const user = userEvent.setup();
      const newKey = makeKey({ id: "k-new", name: "My Key" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: newKey, rawKey: RAW_KEY }),
      });

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "My Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));

      await waitFor(() => screen.getByText("API Key Created"));
      expect(screen.queryByText(RAW_KEY)).not.toBeInTheDocument();
    });

    it("does not open the dialog on a failed create", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Maximum of 10 API keys allowed." }),
      });

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "New Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));

      await waitFor(() => {
        expect(screen.queryByText("API Key Created")).not.toBeInTheDocument();
      });
    });

    it("shows 'Creating…' and disables button while the request is in flight", async () => {
      const user = userEvent.setup();
      mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "Slow Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));

      expect(screen.getByRole("button", { name: /Creating/ })).toBeDisabled();
    });

    it("adds the new key to the table after creation", async () => {
      const user = userEvent.setup();
      const newKey = makeKey({ id: "k-new", name: "Brand New Key" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: newKey, rawKey: RAW_KEY }),
      });

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "Brand New Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));

      await waitFor(() => screen.getByText("API Key Created"));

      // Close dialog
      await user.click(screen.getByRole("button", { name: /Done/ }));

      await waitFor(() => {
        expect(screen.getByText("Brand New Key")).toBeInTheDocument();
      });
    });
  });

  describe("key visibility toggle", () => {
    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      const newKey = makeKey({ id: "k-new", name: "My Key" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: newKey, rawKey: RAW_KEY }),
      });
      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "My Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));
      await waitFor(() => screen.getByText("API Key Created"));
    }

    it("reveals the full key when eye button is clicked", async () => {
      const user = userEvent.setup();
      await openDialog(user);

      await user.click(screen.getByRole("button", { name: /Reveal key/ }));
      expect(screen.getByText(RAW_KEY)).toBeInTheDocument();
    });

    it("re-masks the key when eye button is clicked again", async () => {
      const user = userEvent.setup();
      await openDialog(user);

      await user.click(screen.getByRole("button", { name: /Reveal key/ }));
      await user.click(screen.getByRole("button", { name: /Hide key/ }));
      expect(screen.queryByText(RAW_KEY)).not.toBeInTheDocument();
    });
  });

  describe("copy to clipboard", () => {
    it("copies the raw key when copy button is clicked", async () => {
      // userEvent.setup() installs its own clipboard stub on navigator
      const user = userEvent.setup();
      const writeSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);

      const newKey = makeKey({ id: "k-new", name: "My Key" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: newKey, rawKey: RAW_KEY }),
      });

      render(<ApiKeyManager initialKeys={[]} />);
      await user.type(screen.getByPlaceholderText(/Key name/), "My Key");
      await user.click(screen.getByRole("button", { name: /Generate Key/ }));
      await waitFor(() => screen.getByText("API Key Created"));

      await user.click(screen.getByRole("button", { name: /Copy key/ }));
      expect(writeSpy).toHaveBeenCalledWith(RAW_KEY);
    });
  });

  describe("key revocation", () => {
    it("removes the key row on successful revoke", async () => {
      const user = userEvent.setup();
      const keys = [makeKey({ id: "k1", name: "Old Key" })];
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(<ApiKeyManager initialKeys={keys} />);
      expect(screen.getByText("Old Key")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Revoke/ }));

      await waitFor(() => {
        expect(screen.queryByText("Old Key")).not.toBeInTheDocument();
      });
    });

    it("keeps the key row when revoke fails", async () => {
      const user = userEvent.setup();
      const keys = [makeKey({ id: "k1", name: "Sticky Key" })];
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to revoke key" }),
      });

      render(<ApiKeyManager initialKeys={keys} />);
      await user.click(screen.getByRole("button", { name: /Revoke/ }));

      await waitFor(() => {
        expect(screen.getByText("Sticky Key")).toBeInTheDocument();
      });
    });
  });
});
