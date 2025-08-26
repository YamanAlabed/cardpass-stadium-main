// Baut die Verify-URL für einen Code (lokal: window.origin oder per .env)
export function getVerifyUrl(code: string) {
  const base = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const url = new URL("/verify", base);
  url.searchParams.set("c", code); // kurz statt ?code=
  return url.toString();
}
