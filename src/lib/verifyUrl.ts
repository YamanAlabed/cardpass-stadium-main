export function getVerifyUrl(code: string) {
  const base = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const url = new URL('/verify', base);
  url.searchParams.set('c', code);
  return url.toString();
}
