import type { SimulationResponse } from "@/types";
import { personaLabel } from "@/lib/personas";

/* Share card of a result (Faz 16): 1200×630 PNG, the size link previews use. Drawn on a canvas in the browser,
   in the page's own theme tokens and fonts (DESIGN.md), so nothing is uploaded anywhere. */

const W = 1200;
const H = 630;

function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return value ? `hsl(${value})` : "#888";
}

function font(variable: string, fallback: string): string {
  const family = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return family || fallback;
}

/** Up to `maxLines` lines that fit `width`; the last one ends with … when cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join(" ").length < text.length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

export async function renderShareCard(data: SimulationResponse, productName: string): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const display = font("--font-bricolage", "sans-serif");
  const body = font("--font-nunito", "sans-serif");

  // paper and card
  ctx.fillStyle = token("background");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = token("shadow-ink");
  ctx.beginPath();
  ctx.roundRect(46, 50, W - 88, H - 92, 28);
  ctx.fill();
  ctx.fillStyle = token("card");
  ctx.strokeStyle = token("border");
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, 40, W - 88, H - 92, 28);
  ctx.fill();
  ctx.stroke();

  // brand
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = token("foreground");
  ctx.font = `800 34px ${display}`;
  ctx.fillText("PazarLab", 84, 104);
  const brandWidth = ctx.measureText("PazarLab ").width;
  ctx.fillStyle = token("primary");
  ctx.fillText("AI", 84 + brandWidth, 104);

  // product
  ctx.fillStyle = token("foreground");
  ctx.font = `800 46px ${display}`;
  wrap(ctx, productName, 640, 2).forEach((line, i) => ctx.fillText(line, 84, 182 + i * 54));

  // score
  ctx.font = `800 150px ${display}`;
  ctx.fillText(String(data.overallScore), 80, 420);
  const scoreWidth = ctx.measureText(String(data.overallScore)).width;
  ctx.fillStyle = token("muted-foreground");
  ctx.font = `700 26px ${body}`;
  ctx.fillText("/100 genel skor", 92 + scoreWidth, 420);

  // buyers line
  const range = data.buyersRange && data.buyersRange.high > data.buyersRange.low ? ` (${data.buyersRange.low}–${data.buyersRange.high})` : "";
  ctx.fillStyle = token("foreground-2");
  ctx.font = `700 28px ${body}`;
  ctx.fillText(`${data.estimatedBuyers}${range} alıcı · ${data.simulatedConsumers} sentetik tüketici`, 84, 476);
  const top = [...(data.allPersonas?.length ? data.allPersonas : data.topPersonas)].sort((a, b) => b.purchaseProbability - a.purchaseProbability)[0];
  if (top) {
    ctx.font = `600 24px ${body}`;
    ctx.fillText(`En istekli: ${personaLabel(top.name)} %${Math.round(top.purchaseProbability * 100)}`, 84, 516);
  }

  // decision ring (buy / watch / skip), 2px gaps like the page's ring
  const dist = data.decisionDistribution ?? { buy: data.estimatedBuyers, watch: 0, skip: data.simulatedConsumers - data.estimatedBuyers };
  const total = dist.buy + dist.watch + dist.skip || 1;
  const cx = 920;
  const cy = 300;
  const r = 140;
  let angle = -Math.PI / 2;
  ctx.lineWidth = 40;
  for (const [value, color] of [[dist.buy, "buy"], [dist.watch, "watch"], [dist.skip, "skip"]] as const) {
    const sweep = (value / total) * Math.PI * 2;
    if (sweep > 0.03) {
      ctx.strokeStyle = token(color);
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle + 0.015, angle + sweep - 0.015);
      ctx.stroke();
    }
    angle += sweep;
  }
  ctx.textAlign = "center";
  ctx.fillStyle = token("foreground");
  ctx.font = `800 64px ${display}`;
  ctx.fillText(String(dist.buy), cx, cy + 14);
  ctx.fillStyle = token("muted-foreground");
  ctx.font = `700 22px ${body}`;
  ctx.fillText("aldı", cx, cy + 48);
  ctx.font = `700 22px ${body}`;
  ctx.fillText(`${dist.watch} kararsız · ${dist.skip} almadı`, cx, cy + r + 62);

  // footer
  ctx.textAlign = "left";
  ctx.fillStyle = token("muted-foreground");
  ctx.font = `600 20px ${body}`;
  ctx.fillText("Talep sinyalidir; satış garantisi değildir.", 84, H - 82);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png failed"))), "image/png"));
}
