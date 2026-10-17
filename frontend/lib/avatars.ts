// Drawn avatars in public/pp_icons (1–10): town residents, debate speakers and the persona chat.
const AVATAR_COUNT = 10;

export const avatarSrc = (n: number) => `/pp_icons/${n}.jpeg`;

/** One avatar per key (key % 10, so the same resident or persona keeps its own); a clash on screen takes the next free one. */
export function pickAvatars(keys: number[]): number[] {
  const used = new Set<number>();
  return keys.map((key) => {
    let n = Math.abs(key) % AVATAR_COUNT;
    while (used.has(n) && used.size < AVATAR_COUNT) n = (n + 1) % AVATAR_COUNT;
    used.add(n);
    return n + 1;
  });
}
