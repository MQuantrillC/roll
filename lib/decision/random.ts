/**
 * Secure randomness helpers. All decision outcomes are computed with
 * crypto-grade randomness BEFORE any animation runs — the animation
 * represents the result, it never determines it.
 */

function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
  // Rejection sampling to avoid modulo bias
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % maxExclusive;
}

export type Rng = (maxExclusive: number) => number;

export const secureRng: Rng = cryptoRandomInt;

export function pickOne<T>(arr: readonly T[], rng: Rng = secureRng): T {
  if (arr.length === 0) throw new Error("Cannot pick from an empty list");
  return arr[rng(arr.length)];
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[], rng: Rng = secureRng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Sample n distinct elements (fewer if the array is smaller). */
export function sample<T>(arr: readonly T[], n: number, rng: Rng = secureRng): T[] {
  if (n >= arr.length) return shuffle(arr, rng);
  return shuffle(arr, rng).slice(0, n);
}
