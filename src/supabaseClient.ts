// Shared Supabase client for embedded Cielo. Bound to Family Core's
// storageKey so that when the parent command-center workshop logs in
// via house-auth.js, this client automatically sees the same session
// (same origin + same localStorage key IS the auth handoff).
//
// Lazy-loads @supabase/supabase-js to keep standalone (unauthed)
// bundles small. When env vars are missing we short-circuit to null
// and callers fall back to the static JSON snapshot.

const STORAGE_KEY = "sb-ckjcieeccopqowlfljja-auth-token";

let clientPromise: Promise<any | null> | null = null;

export function getSupabaseClient(): Promise<any | null> {
  if (clientPromise) return clientPromise;
  const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }
  clientPromise = import(/* @vite-ignore */ "@supabase/supabase-js").then((m) =>
    m.createClient(url, key, {
      auth: {
        storage: window.localStorage,
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  );
  return clientPromise;
}

export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    if (!client) return false;
    const { data } = await client.auth.getSession();
    return !!data?.session;
  } catch {
    return false;
  }
}
