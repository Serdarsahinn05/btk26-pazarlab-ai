import { SimulationRequest, SimulationResponse } from "@/types";

/**
 * Per-browser simulation history (DESIGN.md / IMPROVEMENTS 5a).
 * Full responses are cached so old results open even if the server copy expired.
 * Every storage access is wrapped: private mode or blocked storage must never break the app.
 */
export interface HistoryEntry {
  id: string; // server share id, or "local-<timestamp>" when the server could not save
  createdAt: number; // ms
  productName: string;
  category: string;
  overallScore: number;
  response: SimulationResponse;
  /** Original input (images stripped) for the what-if tools; missing on old entries. */
  request?: SimulationRequest | null;
}

/** Drop uploaded images before caching a request: they can be megabytes each. */
export function storableRequest(request: SimulationRequest): SimulationRequest {
  return { ...request, images: [] };
}

const KEY = "pazarlab-history-v1";
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): HistoryEntry[] {
  let list = entries.slice(0, MAX_ENTRIES);
  // If the quota is hit, drop the oldest entries until it fits.
  while (list.length > 0) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
      return list;
    } catch {
      list = list.slice(0, -1);
    }
  }
  return list;
}

export function addToHistory(entry: HistoryEntry): HistoryEntry[] {
  return saveHistory([entry, ...loadHistory().filter((e) => e.id !== entry.id)]);
}

export function removeFromHistory(id: string): HistoryEntry[] {
  return saveHistory(loadHistory().filter((e) => e.id !== id));
}

export function findInHistory(id: string): HistoryEntry | undefined {
  return loadHistory().find((e) => e.id === id);
}

export function exportHistory(): void {
  const blob = new Blob([JSON.stringify(loadHistory(), null, 2)], { type: "application/json" });
  downloadBlob(blob, `pazarlab-gecmis-${new Date().toISOString().slice(0, 10)}.json`);
}

/** Merge a previously exported file into the current history. Returns the new list. */
export async function importHistory(file: File): Promise<HistoryEntry[]> {
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed)) throw new Error("not a history file");
  const incoming = parsed.filter(isEntry);
  if (incoming.length === 0) throw new Error("no entries");
  const merged = new Map<string, HistoryEntry>();
  [...incoming, ...loadHistory()].forEach((e) => merged.set(e.id, e));
  return saveHistory(Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isEntry(value: unknown): value is HistoryEntry {
  const e = value as HistoryEntry;
  return !!e && typeof e.id === "string" && typeof e.productName === "string" && typeof e.response?.overallScore === "number";
}
