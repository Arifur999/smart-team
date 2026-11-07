/**
 * Film times as people and critics write them: "2.4", "8.6-9.2", "0:12", "1:02.5", "3s".
 * Returns the start in seconds, or null when the text holds no time.
 */
export function parseAt(text: string | undefined | null): number | null {
  if (!text) return null;
  const first = text.trim().split(/\s*[-–]\s*/)[0]!.replace(/s$/i, '');
  const parts = first.split(':');
  if (parts.length > 3 || parts.some((p) => p === '' || Number.isNaN(Number(p)))) return null;
  const seconds = parts.reduce((total, p) => total * 60 + Number(p), 0);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** "0:02.4": minutes, seconds and tenths. */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
}

/** Time references written inside free text, like "[0:12]" or "at 3.4s", so notes can be clicked to seek. */
export const TIME_IN_TEXT = /\[(\d+(?::\d{1,2})?(?:\.\d+)?)\]/g;
