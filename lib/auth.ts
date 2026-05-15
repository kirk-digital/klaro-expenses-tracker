import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret,
  pages: {
    signIn: "/sign-in",
    newUser: "/onboarding",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session && typeof session === "object" && "orgSlug" in session) {
        token.orgSlug = (session as { orgSlug?: string }).orgSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      if (session.user && token.orgSlug) {
        session.user.orgSlug = token.orgSlug as string;
      }
      return session;
    },
  },
});
