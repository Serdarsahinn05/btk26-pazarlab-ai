"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Trash2, Upload } from "lucide-react";
import { HistoryEntry, exportHistory, importHistory, loadHistory, removeFromHistory } from "@/lib/history";
import { cn } from "@/lib/utils";

function scoreClass(score: number) {
  return score >= 60 ? "text-buy-text" : score >= 40 ? "text-watch-text" : "text-skip-text";
}

/** "Son simülasyonlar" card: per-browser history with open / delete / export / import. */
export default function RecentSimulations() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setEntries(loadHistory()), []);

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      const next = await importHistory(file);
      setEntries(next);
      setMessage("Geçmiş içe aktarıldı.");
    } catch {
      setMessage("Bu dosya bir PazarLab geçmiş yedeği değil.");
    }
  };

  return (
    <section className="card-paper space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="squiggle text-[19px] font-bold">Son simülasyonlar</h2>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button type="button" onClick={exportHistory} className="btn-sticker !px-3 !py-1 text-xs">
              <Download className="h-3.5 w-3.5" aria-hidden /> Yedek indir
            </button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-sticker !px-3 !py-1 text-xs">
            <Upload className="h-3.5 w-3.5" aria-hidden /> Yedekten yükle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Henüz kayıt yok. Çalıştırdığınız simülasyonlar bu tarayıcıda saklanır ve buradan yeniden açılır.
        </p>
      ) : (
        <ul className="divide-y-2 divide-dashed divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <Link href={`/dashboard?r=${encodeURIComponent(e.id)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:underline">
                <span className={cn("w-10 shrink-0 font-display text-lg font-extrabold", scoreClass(e.overallScore))}>{e.overallScore}</span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{e.productName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                    {e.id.startsWith("local-") && " · yalnızca bu tarayıcıda"}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setEntries(removeFromHistory(e.id))}
                aria-label={`${e.productName} kaydını sil`}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="text-sm text-foreground-2" aria-live="polite">{message}</p>}
    </section>
  );
}
