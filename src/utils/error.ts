export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(String(e));
}
