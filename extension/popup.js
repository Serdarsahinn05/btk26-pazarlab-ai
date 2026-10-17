import { importUrl } from "./handoff.js";
import { snapshotPage } from "./snapshot.js";

const DEFAULTS = { site: "http://localhost:3000", api: "http://localhost:8000" };
// The API accepts at most 3,000,000 characters of HTML (ProductPageRequest.html).
const MAX_HTML_CHARS = 2_900_000;

const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULTS };
// Checked when the popup opens, so a click on an already allowed API asks nothing.
let apiAllowed = false;
const apiOrigins = () => ({ origins: [`${settings.api}/*`] });

function show(el, text, tone = "") {
  el.textContent = text;
  el.className = `status ${tone}`.trim();
}

async function loadSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.sync.get(["site", "api"])) };
}

function cleanBase(value) {
  const url = new URL(value.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
  return url.origin;
}

function errorText(status, api) {
  if (status === 429) return "Çok sık denedin; bir dakika sonra tekrar dene.";
  if (status === 413 || status === 422) return "Sayfa okunamayacak kadar büyük ya da boş.";
  if (status) return `PazarLab bu sayfayı okuyamadı (HTTP ${status}).`;
  return `PazarLab API'sine ulaşılamadı (${api}). Ayarlardaki adresi kontrol et.`;
}

async function send() {
  const status = $("status");
  const button = $("send");
  const { site, api } = settings;
  button.disabled = true;
  try {
    // Only for a newly set API address; first call of the click, as Chrome shows the prompt only during the gesture.
    if (!apiAllowed && !(apiAllowed = await chrome.permissions.request(apiOrigins()))) {
      show(status, `${api} adresine erişim izni verilmedi.`, "error");
      return;
    }
    show(status, "Sayfa okunuyor…");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let snapshot;
    try {
      [{ result: snapshot }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: snapshotPage, args: [MAX_HTML_CHARS] });
    } catch {
      show(status, "Bu sayfada çalışamıyorum (tarayıcı sayfaları ve mağaza eklenti sayfaları kapalı).", "error");
      return;
    }
    if (!snapshot || snapshot.error) {
      show(status, "Sayfa çok büyük; ürün sayfasının kendisinde dene.", "error");
      return;
    }

    show(status, "PazarLab okuyor…");
    let response;
    try {
      response = await fetch(`${api}/api/read-product-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: snapshot.html, url: snapshot.url }),
      });
    } catch {
      show(status, errorText(0, api), "error");
      return;
    }
    if (!response.ok) {
      show(status, errorText(response.status, api), "error");
      return;
    }
    const result = await response.json();
    show(status, result.title ? "Hazır, PazarLab açılıyor." : "Ürün bilgisi az; PazarLab'da eksikleri tamamla.", "ok");
    await chrome.tabs.create({ url: importUrl(site, result), index: tab.index + 1 });
    window.close();
  } finally {
    button.disabled = false;
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("page").textContent = tab?.title || tab?.url || "–";
  settings = await loadSettings();
  apiAllowed = await chrome.permissions.contains(apiOrigins());
  $("site").value = settings.site;
  $("api").value = settings.api;
  $("send").addEventListener("click", send);
  $("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const values = { site: cleanBase($("site").value), api: cleanBase($("api").value) };
      await chrome.storage.sync.set(values);
      settings = values;
      apiAllowed = await chrome.permissions.contains(apiOrigins());
      $("site").value = values.site;
      $("api").value = values.api;
      show($("settings-status"), "Kaydedildi.", "ok");
    } catch {
      show($("settings-status"), "Adresler http:// ya da https:// ile başlamalı.", "error");
    }
  });
}

init();
