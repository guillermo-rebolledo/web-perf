import { Resend } from "resend";
import { render } from "@react-email/components";
import { env } from "@/env";
import { WeeklyDigestEmail } from "@/emails/weekly-digest";
import type { UserDigestData } from "./aggregator";
import { generateUnsubscribeToken } from "./unsubscribe-token";
import { format } from "date-fns";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in your environment to send digest emails."
    );
  }
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Renders and sends the weekly digest email for a single user via Resend.
 * Throws if the Resend API returns an error.
 */
export async function sendDigestEmail(data: UserDigestData): Promise<void> {
  const appUrl = env.NEXTAUTH_URL;
  const token = generateUnsubscribeToken(data.user.id);
  const unsubscribeUrl = `${appUrl}/api/digest/unsubscribe?token=${token}`;

  const html = await render(
    WeeklyDigestEmail({ data, unsubscribeUrl, appUrl })
  );

  const weekLabel = `${format(data.weekRange.start, "MMM d")} – ${format(data.weekRange.end, "MMM d, yyyy")}`;
  const subject = `PerfLabs Weekly Digest — ${weekLabel}`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: data.user.email,
    subject,
    html,
    headers: {
      // CAN-SPAM one-click unsubscribe header
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    throw new Error(`Resend error for ${data.user.email}: ${error.message}`);
  }
}
