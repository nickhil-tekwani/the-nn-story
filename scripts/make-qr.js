#!/usr/bin/env node
/**
 * Generate printable QR codes that point at a URL.
 *
 *   node scripts/make-qr.js [url] [count]
 *
 * Defaults to the engagement-party menu page. Outputs to ./qr :
 *   - <slug>-qr.png         a single high-res PNG (for stickers / one-offs)
 *   - <slug>-sheet.html     a print-ready sheet of `count` table cards
 *                           (open in a browser → Cmd-P → print). QR is inlined
 *                           as a data URL, so the sheet needs no internet to print.
 */

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const url = process.argv[2] || "https://nickhilandnikki.com/akahoshi";
const count = parseInt(process.argv[3] || "9", 10);

const slug =
  url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "qr";

const outDir = path.join(process.cwd(), "qr");
fs.mkdirSync(outDir, { recursive: true });

const qrOpts = {
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#1a1613", light: "#fdfcf9" },
};

async function main() {
  // 1. High-res standalone PNG
  const pngPath = path.join(outDir, `${slug}-qr.png`);
  await QRCode.toFile(pngPath, url, { ...qrOpts, width: 1200 });

  // 2. Inline data URL reused across the printable sheet
  const dataUrl = await QRCode.toDataURL(url, { ...qrOpts, width: 600 });

  const card = `
    <div class="card">
      <div class="couple">Nickhil <span class="star">&#9733;</span> Nikki</div>
      <img class="qr" src="${dataUrl}" alt="Scan for the menu" />
      <div class="cta">Scan for the menu</div>
      <div class="url">nickhilandnikki.com/akahoshi</div>
    </div>`;

  const cards = Array.from({ length: count }, () => card).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Scan for the menu — print sheet</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "PT Serif", Georgia, serif;
    color: #1a1613;
    padding: 0.4in;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25in;
  }
  .card {
    border: 1px dashed rgba(26,22,19,0.25);
    border-radius: 10px;
    padding: 0.28in 0.2in;
    text-align: center;
    page-break-inside: avoid;
  }
  .couple {
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #6b645c;
    margin-bottom: 10px;
  }
  .star { color: #c1121f; }
  .qr {
    width: 100%;
    max-width: 1.7in;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .cta {
    font-family: "Gilda Display", serif;
    font-size: 17px;
    margin-top: 10px;
  }
  .url {
    font-size: 10px;
    letter-spacing: 0.06em;
    color: #8a847b;
    margin-top: 3px;
  }
  @media print {
    body { padding: 0.3in; }
    .card { border-color: rgba(26,22,19,0.18); }
  }
</style>
</head>
<body>
  <div class="grid">${cards}</div>
</body>
</html>`;

  const htmlPath = path.join(outDir, `${slug}-sheet.html`);
  fs.writeFileSync(htmlPath, html);

  console.log(`QR → ${url}`);
  console.log(`  PNG   : ${path.relative(process.cwd(), pngPath)}`);
  console.log(`  Sheet : ${path.relative(process.cwd(), htmlPath)} (${count} cards — open & print)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
