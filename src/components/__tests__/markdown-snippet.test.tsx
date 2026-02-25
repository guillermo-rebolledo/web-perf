import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MarkdownSnippet } from "../markdown-snippet";

describe("MarkdownSnippet", () => {
  it("shows a loading placeholder until markdown is parsed", async () => {
    const { container } = render(<MarkdownSnippet md="# Hello" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    // Wait for effect to settle so React does not warn about state updates after assert
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
  });

  it("renders plain text markdown as HTML", async () => {
    render(<MarkdownSnippet md="Plain paragraph text." />);
    await waitFor(() => {
      expect(screen.getByText("Plain paragraph text.")).toBeInTheDocument();
    });
  });

  it("renders headings", async () => {
    render(<MarkdownSnippet md="### Section Title\n\nBody here." />);
    await waitFor(() => {
      // Marked may put heading and paragraph in one block; match by substring
      expect(screen.getByText(/Section Title/)).toBeInTheDocument();
      expect(screen.getByText(/Body here\./)).toBeInTheDocument();
    });
  });

  it("renders bold text", async () => {
    render(<MarkdownSnippet md="The **LCP** metric matters." />);
    await waitFor(() => {
      expect(screen.getByText(/LCP/)).toBeInTheDocument();
    });
  });

  it("renders links with allowed attributes", async () => {
    render(
      <MarkdownSnippet md='[Example](https://example.com "title")' />
    );
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /Example/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });

  it("sanitizes script tags and does not execute them", async () => {
    const md = 'Safe text <script>window.x="pwned"</script> more text';
    render(<MarkdownSnippet md={md} />);
    await waitFor(() => {
      expect(screen.getByText(/Safe text/)).toBeInTheDocument();
      expect(screen.getByText(/more text/)).toBeInTheDocument();
      const script = document.querySelector("script");
      expect(script).not.toBeInTheDocument();
    });
  });

  it("handles empty string without error", async () => {
    const { container } = render(<MarkdownSnippet md="" />);
    await waitFor(() => {
      // Empty markdown yields empty or minimal HTML; no crash
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it("updates rendered content when md prop changes", async () => {
    const { rerender } = render(<MarkdownSnippet md="First" />);
    await waitFor(() => {
      expect(screen.getByText("First")).toBeInTheDocument();
    });

    rerender(<MarkdownSnippet md="Second" />);
    await waitFor(() => {
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.queryByText("First")).not.toBeInTheDocument();
    });
  });
});
