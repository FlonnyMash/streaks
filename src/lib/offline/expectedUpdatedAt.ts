/**
 * TanStack Query runs `onMutate` before `mutationFn`. Optimistic updates often
 * bump `updated_at` or remove the row, so reading the cache in `mutationFn`
 * captures the wrong base version for conflict detection.
 *
 * Stash the pre-mutate server `updated_at` in `onMutate`, then read it in `mutationFn`.
 * Values are overwritten on the next mutate for the same key (safe across retries).
 */
const pending = new Map<string, string | null>()

export function stashExpectedUpdatedAt(key: string, value: string | null | undefined) {
  pending.set(key, value ?? null)
}

export function readExpectedUpdatedAt(key: string): string | null {
  return pending.has(key) ? (pending.get(key) ?? null) : null
}
