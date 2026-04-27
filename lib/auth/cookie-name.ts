// Edge-safe constant: importable from proxy.ts (Edge runtime) and from
// lib/auth/cookies.ts (Node-only). Lives in its own file so the rest of
// cookies.ts can keep `import "server-only"`.

export const SESSION_COOKIE_NAME = "bdc_session";
