"use client";

import { useSession } from "next-auth/react";

/**
 * Redirects to sign-in when the session is lost (e.g. account deleted in
 * another tab). Must be rendered inside the authenticated (app) layout.
 * useSession({ required: true }) handles the redirect automatically when
 * status transitions to "unauthenticated".
 */
export function SessionGuard() {
  useSession({ required: true });
  return null;
}
