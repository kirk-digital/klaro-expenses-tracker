import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      name?: string | null;
      email?: string | null;
      orgSlug?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgSlug?: string;
  }
}
