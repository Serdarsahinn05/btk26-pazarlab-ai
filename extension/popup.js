import { API_URL, SITE_URL } from "./config.js";
import { importUrl } from "./handoff.js";
import { snapshotPage } from "./snapshot.js";

// The API accepts at most 3,000,000 characters of HTML (ProductPageRequest.html).
const MAX_HTML_CHARS = 2_900_000;
// The free hosting plan sleeps when idle; the first request can take about a minute.
const WAKE_NOTE_AFTER_MS = 6000;

const $ = (id) => document.getElementById(id);

function show(text, tone = "") {
  const el = $("status");
  el.textContent = text;
  el.className = `status ${tone}`.trim();
}

function errorText(status) {
  if (status === 429) return "Çok sık denedin; bir dakika sonra tekrar dene.";
  if (status === 413 || status === 422) return "Sayfa okunamayacak kadar büyük ya da boş.";
  if (status) return `PazarLab bu sayfayı okuyamadı (HTTP ${status}).`;
  return "PazarLab'a ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.";
}

async function send() {
  const button = $("send");
  button.disabled = true;
  show("Sayfa okunuyor…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let snapshot;
    try {
      [{ result: snapshot }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: snapshotPage, args: [MAX_HTML_CHARS] });
    } catch {
      show("Bu sayfada çalışamıyorum (tarayıcı sayfaları ve eklenti mağazası kapalı).", "error");
      return;
    }
    if (!snapshot || snapshot.error) {
      show("Sayfa çok büyük; ürün sayfasının kendisinde dene.", "error");
      return;
    }

    show("PazarLab okuyor…");
    const wake = setTimeout(() => show("Sunucu uyanıyor; ilk istek bir dakika kadar sürebilir…"), WAKE_NOTE_AFTER_MS);
    let response;
    try {
      response = await fetch(`${API_URL}/api/read-product-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: snapshot.html, url: snapshot.url }),
      });
    } catch {
      show(errorText(0), "error");
      return;
    } finally {
      clearTimeout(wake);
    }
    if (!response.ok) {
      show(errorText(response.status), "error");
      return;
    }
    const result = await response.json();
    show(result.title ? "Hazır, PazarLab açılıyor." : "Ürün bilgisi az; PazarLab'da eksikleri tamamla.", "ok");
    await chrome.tabs.create({ url: importUrl(SITE_URL, result), index: tab.index + 1 });
    window.close();
  } finally {
    button.disabled = false;
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("page").textContent = tab?.title || tab?.url || "–";
  $("privacy").href = `${SITE_URL}/gizlilik`;
  $("site").href = SITE_URL;
  $("send").addEventListener("click", send);
}

init();
