import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunAISummary } from "../run-ai-summary";
import type { UseCompletionHelpers } from "@ai-sdk/react";

// Mock the AI SDK hook — the component's only external dependency
vi.mock("@ai-sdk/react", () => ({
  useCompletion: vi.fn(),
}));

// Render raw markdown text synchronously to avoid act() warnings from the
// async marked.parse / sanitize-html pipeline inside MarkdownSnippet.
// Markdown-specific rendering is covered by markdown-snippet.test.tsx.
vi.mock("@/components/markdown-snippet", () => ({
  MarkdownSnippet: ({ md }: { md: string }) => <div>{md}</div>,
}));

import { useCompletion } from "@ai-sdk/react";

// ---------------------------------------------------------------------------

const FIXED_NOW = new Date("2025-06-01T12:00:00Z");

/** Default hook return — no loading, no error, no completion */
function defaultHook(overrides: Partial<UseCompletionHelpers> = {}): UseCompletionHelpers {
  return {
    complete: vi.fn(),
    completion: "",
    isLoading: false,
    error: undefined,
    stop: vi.fn(),
    setCompletion: vi.fn(),
    input: "",
    setInput: vi.fn(),
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  runId: "run-1",
  initialSummary: null,
  aiSummaryAt: null,
  aiSummaryModel: null,
} as const;

// ---------------------------------------------------------------------------

describe("RunAISummary", () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_NOW);
    vi.mocked(useCompletion).mockReturnValue(defaultHook());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --- Initial state: no summary ---

  describe("when there is no existing summary", () => {
    it("shows the placeholder description", () => {
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(
        screen.getByText(/AI-powered narrative summary/i)
      ).toBeInTheDocument();
    });

    it("shows the Generate AI Analysis button", () => {
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(
        screen.getByRole("button", { name: /Generate AI Analysis/i })
      ).toBeInTheDocument();
    });

    it("does not show the Generated label", () => {
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(screen.queryByText(/Generated/i)).not.toBeInTheDocument();
    });
  });

  // --- Initial state: existing summary ---

  describe("when an initial summary is provided", () => {
    const summaryProps = {
      runId: "run-1",
      initialSummary: "## Executive Summary\n\nThe site is performing well.",
      aiSummaryAt: new Date("2025-06-01T11:30:00Z"), // 30 min before FIXED_NOW
      aiSummaryModel: "gpt-4o-mini",
    };

    it("renders the summary text", () => {
      render(<RunAISummary {...summaryProps} />);
      expect(screen.getByText(/The site is performing well/i)).toBeInTheDocument();
    });

    it("shows the Regenerate button", () => {
      render(<RunAISummary {...summaryProps} />);
      expect(
        screen.getByRole("button", { name: /Regenerate/i })
      ).toBeInTheDocument();
    });

    it("shows a 'Generated' timestamp label", () => {
      render(<RunAISummary {...summaryProps} />);
      expect(screen.getByText(/Generated/i)).toBeInTheDocument();
    });

    it("does not show the model name (removed from UI)", () => {
      render(<RunAISummary {...summaryProps} />);
      expect(screen.queryByText(/gpt-4o-mini/i)).not.toBeInTheDocument();
    });
  });

  // --- Button interactions ---

  describe("Generate / Regenerate button", () => {
    it("calls complete('') when Generate is clicked", async () => {
      const mockComplete = vi.fn();
      vi.mocked(useCompletion).mockReturnValue(defaultHook({ complete: mockComplete }));
      const user = userEvent.setup();

      render(<RunAISummary {...DEFAULT_PROPS} />);
      await user.click(screen.getByRole("button", { name: /Generate AI Analysis/i }));

      expect(mockComplete).toHaveBeenCalledWith("");
    });

    it("passes correct api endpoint to useCompletion", () => {
      render(<RunAISummary runId="abc-123" initialSummary={null} aiSummaryAt={null} aiSummaryModel={null} />);
      expect(vi.mocked(useCompletion)).toHaveBeenCalledWith(
        expect.objectContaining({ api: "/api/runs/abc-123/ai-summary" })
      );
    });

    it("passes streamProtocol: 'text' to useCompletion", () => {
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(vi.mocked(useCompletion)).toHaveBeenCalledWith(
        expect.objectContaining({ streamProtocol: "text" })
      );
    });
  });

  // --- Loading state ---

  describe("while loading", () => {
    it("shows the Generating… label instead of the button", () => {
      vi.mocked(useCompletion).mockReturnValue(
        defaultHook({ isLoading: true, completion: "" })
      );
      render(<RunAISummary {...DEFAULT_PROPS} />);

      expect(screen.getByText(/Generating/i)).toBeInTheDocument();
      // The CollapsibleTrigger is also a button; check that the action button is gone
      expect(
        screen.queryByRole("button", { name: /Generate AI Analysis|Regenerate/i })
      ).not.toBeInTheDocument();
    });

    it("shows the skeleton placeholder when no text has arrived yet", () => {
      vi.mocked(useCompletion).mockReturnValue(
        defaultHook({ isLoading: true, completion: "" })
      );
      const { container } = render(<RunAISummary {...DEFAULT_PROPS} />);
      // Skeletons are rendered as animate-pulse divs
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("shows streaming text as it arrives", () => {
      vi.mocked(useCompletion).mockReturnValue(
        defaultHook({ isLoading: true, completion: "Executive Summary in progress…" })
      );
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(screen.getByText(/Executive Summary in progress/i)).toBeInTheDocument();
    });
  });

  // --- onFinish callback ---

  describe("onFinish", () => {
    it("displays the final summary and shows Regenerate after completion", async () => {
      let capturedOnFinish: ((prompt: string, completion: string) => void) | undefined;

      vi.mocked(useCompletion)
        .mockImplementationOnce((options) => {
          capturedOnFinish = options?.onFinish;
          return defaultHook({ isLoading: true, completion: "Streaming…" });
        })
        .mockReturnValue(defaultHook({ isLoading: false, completion: "" }));

      const { rerender } = render(<RunAISummary {...DEFAULT_PROPS} />);

      act(() => {
        capturedOnFinish?.("", "Final generated summary.");
      });

      rerender(<RunAISummary {...DEFAULT_PROPS} />);

      expect(screen.getByText(/Final generated summary/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
    });
  });

  // --- Error states ---

  describe("error states", () => {
    it("shows a generic error message for non-rate-limit errors", () => {
      vi.mocked(useCompletion).mockReturnValue(
        defaultHook({ error: new Error("Something went wrong") })
      );
      render(<RunAISummary {...DEFAULT_PROPS} />);
      expect(screen.getByText(/Failed to generate analysis/i)).toBeInTheDocument();
    });

    it("shows the amber daily limit message when the API returns a daily_limit error", async () => {
      const dailyLimitError = new Error('{"error":"daily_limit","limit":5}');
      let capturedOnError: ((err: Error) => void) | undefined;

      vi.mocked(useCompletion)
        .mockImplementationOnce((options) => {
          capturedOnError = options?.onError;
          return defaultHook();
        })
        .mockReturnValue(defaultHook({ error: dailyLimitError }));

      const { rerender } = render(<RunAISummary {...DEFAULT_PROPS} />);

      act(() => {
        capturedOnError?.(dailyLimitError);
      });

      rerender(<RunAISummary {...DEFAULT_PROPS} />);

      expect(screen.getByText(/Daily limit/i)).toBeInTheDocument();
      expect(screen.queryByText(/Failed to generate analysis/i)).not.toBeInTheDocument();
    });

    it("shows the generic error message for a cooldown error (button already disabled)", () => {
      // cooldown errors are handled client-side by disabling the button;
      // if somehow a cooldown 429 reaches the hook, it should not show a red error
      const cooldownError = new Error('{"error":"cooldown","retryAfterSeconds":1800}');
      let capturedOnError: ((err: Error) => void) | undefined;

      vi.mocked(useCompletion)
        .mockImplementationOnce((options) => {
          capturedOnError = options?.onError;
          return defaultHook();
        })
        .mockReturnValue(defaultHook({ error: cooldownError }));

      const { rerender } = render(<RunAISummary {...DEFAULT_PROPS} />);

      act(() => {
        capturedOnError?.(cooldownError);
      });

      rerender(<RunAISummary {...DEFAULT_PROPS} />);

      // rateLimitError is "cooldown", not "daily_limit", so generic error shows
      expect(screen.getByText(/Failed to generate analysis/i)).toBeInTheDocument();
    });
  });

  // --- Cooldown UX ---

  describe("cooldown enforcement", () => {
    it("disables Regenerate and shows a countdown when aiSummaryAt is within the last hour", () => {
      const thirtyMinutesAgo = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000);

      render(
        <RunAISummary
          runId="run-1"
          initialSummary="Existing summary."
          aiSummaryAt={thirtyMinutesAgo}
          aiSummaryModel="gpt-4o-mini"
        />
      );

      const button = screen.getByRole("button", { name: /Regenerate/i });
      expect(button).toBeDisabled();
      expect(screen.getByText(/Available in/i)).toBeInTheDocument();
      expect(screen.getByText(/30m/)).toBeInTheDocument();
    });

    it("enables Regenerate when aiSummaryAt is more than an hour ago", () => {
      const twoHoursAgo = new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000);

      render(
        <RunAISummary
          runId="run-1"
          initialSummary="Existing summary."
          aiSummaryAt={twoHoursAgo}
          aiSummaryModel="gpt-4o-mini"
        />
      );

      const button = screen.getByRole("button", { name: /Regenerate/i });
      expect(button).not.toBeDisabled();
      expect(screen.queryByText(/Available in/i)).not.toBeInTheDocument();
    });

    it("does not show the countdown when there is no existing summary", () => {
      // Even with a recent aiSummaryAt, no countdown shows if there's no summary displayed
      const recentDate = new Date(FIXED_NOW.getTime() - 5 * 60 * 1000);

      render(
        <RunAISummary
          runId="run-1"
          initialSummary={null}
          aiSummaryAt={recentDate}
          aiSummaryModel={null}
        />
      );

      // Countdown only appears alongside the Regenerate button
      expect(screen.queryByText(/Available in/i)).not.toBeInTheDocument();
    });
  });

  // --- Markdown rendering ---

  describe("markdown rendering", () => {
    it("renders heading text from a summary with markdown headings", () => {
      // Use expression syntax so \n is a real newline, not a literal backslash-n
      const summary = "### Executive Summary\n\nPerformance is good.\n\n### Priority Action Items\n\n- Fix images";
      render(
        <RunAISummary
          runId="run-1"
          initialSummary={summary}
          aiSummaryAt={null}
          aiSummaryModel={null}
        />
      );
      expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Performance is good/i)).toBeInTheDocument();
    });

    it("renders bold text from a summary", () => {
      render(
        <RunAISummary
          runId="run-1"
          initialSummary={"The **LCP** metric is critical."}
          aiSummaryAt={null}
          aiSummaryModel={null}
        />
      );
      // dangerouslySetInnerHTML renders the <strong> tag; text should be findable
      expect(screen.getByText(/LCP/)).toBeInTheDocument();
    });
  });
});
