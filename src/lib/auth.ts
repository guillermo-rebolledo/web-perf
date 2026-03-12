import NextAuth, { type Session, type User } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import ResendProvider from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import { prisma } from "./prisma";
import { env } from "@/env";

export const { handlers, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    ...(env.RESEND_API_KEY
      ? [
          ResendProvider({
            apiKey: env.RESEND_API_KEY,
            from: env.RESEND_FROM_EMAIL,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async session({ token, session }: { token: JWT; session: Session }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user: User }) {
      const dbUser = await prisma.user.findFirst({
        where: {
          email: token.email ?? undefined,
        },
      });

      if (!dbUser) {
        // Fresh sign-in: user record doesn't exist yet in the DB (edge case
        // with some providers). Carry the id forward from the trigger payload.
        if (user?.id) {
          token.id = user.id;
          return token;
        }
        // User was deleted — returning null invalidates the JWT and forces
        // the session to null on the next check, signing the user out.
        return null;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },
});
