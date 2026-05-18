import { XeroClient } from "xero-node";

const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.settings.read",
  "offline_access",
];

export function createXeroClient(options?: { state?: string; scopes?: string[] }) {
  return new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: options?.scopes ?? XERO_SCOPES,
    state: options?.state,
  });
}

export function tokenExpiresAt(tokenSet: { expires_at?: number; expires_in?: number }) {
  if (tokenSet.expires_at) {
    return new Date(tokenSet.expires_at * 1000);
  }
  return new Date(Date.now() + (tokenSet.expires_in ?? 1800) * 1000);
}
