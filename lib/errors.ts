/**
 * Supabase/PostgREST errors are plain objects with a `message` property, not
 * `Error` instances — `err instanceof Error` silently misses them and falls
 * through to a generic fallback. Check for a `message` property generically.
 */
export function getErrorMessage(err: unknown, fallback = "Algo deu errado."): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return fallback;
}
