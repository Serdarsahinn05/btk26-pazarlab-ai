import { expect, test } from "@playwright/test";
import { detectCategory, foldText } from "../lib/categories";

// Same cases as backend tests/test_categories.py::test_title_detection: the form's guess must match the link reader's.
const TITLES: Array<[string, string | null]> = [
  ["Laptop Çantası 15.6 inç", "canta"],
  ["iPhone 15 Pro Şeffaf Kılıf", "kilif"],
  ["24 Saat Kalıcı Mat Ruj", "makyaj"],
  ["ERKEK DERİ BOT", "bot"],
  ["Krem Rengi Oversize Tişört", "tisort"],
  ["Güneş Kremi SPF50", "cilt_bakim"],
  ["Deri Cüzdan", "cuzdan"],
  ["Xiaomi Robot Süpürge", "supurge"],
  ["Apple Watch Series 10", "akilli_saat"],
  ["Kablosuz Kulaklık", "kulaklik"],
  ["Xiaomi Mi Band 8 Akıllı Bileklik", "akilli_bileklik"],
  ["Gümüş Zincir Bileklik", "taki"],
  ["Casio Erkek Kol Saati", "kol_saati"],
  ["Dekoratif Duvar Saati", "dekorasyon"],
  ["Philips Airfryer XXL", "airfryer"],
  ["Kamp Çadırı 4 Kişilik", "kamp"],
  ["Kinder Bebek Arabası", "bebek_arabasi"],
  ["Samsung Galaxy S24 128 GB", "telefon"],
  ["Samsung 55 inç QLED TV", null], // backend: "diger"
];

test("Turkish folding matches the backend", () => {
  expect(foldText("TİŞÖRT Kumaş ÇANTA ığüşöç")).toBe("tisort kumas canta igusoc");
});

for (const [title, expected] of TITLES) {
  test(`detects "${title}"`, () => {
    expect(detectCategory(title)).toBe(expected);
  });
}
