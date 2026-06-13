#!/usr/bin/env node
/**
 * Add photos to the /gallery rotation — upload to Vercel Blob and update the
 * manifest, with zero copy-pasting of links.
 *
 *   npm run gallery:add <folder>                 # add every image in a folder
 *   npm run gallery:add photo.jpg other.png      # or specific files
 *   npm run gallery:add <folder> --no-commit     # skip the git commit/push
 *
 * For each image it:
 *   1. Reads dimensions + EXIF rotation → tags landscape (desktop) / portrait (mobile)
 *   2. Hashes the bytes → a stable blob key, so re-running never double-uploads
 *   3. Uploads to Vercel Blob and reads the public URL straight back
 *   4. Appends the entry to src/app/gallery/manifest.json (dedup by hash)
 *   5. Commits + pushes the manifest to prod (unless --no-commit)
 *
 * One-time setup: put BLOB_READ_WRITE_TOKEN in .env.local
 *   (Vercel dashboard → Storage → your Blob store → ".env.local" tab / tokens)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

// Load .env.local so BLOB_READ_WRITE_TOKEN is available.
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const { put } = require("@vercel/blob");
const { imageSize } = require("image-size");

const MANIFEST_PATH = path.join(process.cwd(), "src/app/gallery/manifest.json");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  fail(
    "BLOB_READ_WRITE_TOKEN is not set.\n" +
      "  Add it to .env.local — grab it from the Vercel dashboard:\n" +
      "  Storage → your Blob store → the '.env.local' tab (or Project Settings → Environment Variables).\n" +
      "  Line should look like:  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx"
  );
}

// ---- Collect input files -------------------------------------------------

const rawArgs = process.argv.slice(2);
const noCommit = rawArgs.includes("--no-commit");
const inputs = rawArgs.filter((a) => !a.startsWith("--"));

if (inputs.length === 0) {
  fail(
    "Give me a folder or some image files.\n" +
      "  npm run gallery:add ~/Desktop/photos-to-add\n" +
      "  npm run gallery:add pic1.jpg pic2.jpg"
  );
}

function collectFiles(targets) {
  const out = [];
  for (const t of targets) {
    const abs = path.resolve(t);
    if (!fs.existsSync(abs)) {
      console.warn(`  • skipping (not found): ${t}`);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(abs)) {
        const p = path.join(abs, name);
        if (
          fs.statSync(p).isFile() &&
          IMAGE_EXT.has(path.extname(p).toLowerCase())
        ) {
          out.push(p);
        }
      }
    } else if (IMAGE_EXT.has(path.extname(abs).toLowerCase())) {
      out.push(abs);
    } else {
      console.warn(`  • skipping (not an image): ${t}`);
    }
  }
  return out.sort();
}

const files = collectFiles(inputs);
if (files.length === 0) {
  fail("No images found (looked for .jpg .jpeg .png .webp .gif).");
}

// ---- Manifest helpers ----------------------------------------------------

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    fail(`manifest.json exists but is not valid JSON: ${MANIFEST_PATH}`);
  }
}

function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// EXIF orientation values 5–8 mean the image is rotated 90°, so the displayed
// width/height are swapped relative to the stored pixel dimensions.
function displayDimensions(dim) {
  const rotated = dim.orientation && dim.orientation >= 5;
  return rotated
    ? { width: dim.height, height: dim.width }
    : { width: dim.width, height: dim.height };
}

// ---- Main ----------------------------------------------------------------

(async () => {
  const manifest = loadManifest();
  const seen = new Set(manifest.map((m) => m.hash));
  const today = new Date().toISOString().slice(0, 10);

  let added = 0;
  console.log(`\nFound ${files.length} image(s). Uploading…\n`);

  for (const file of files) {
    const buf = fs.readFileSync(file);
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
    const base = path.basename(file);

    if (seen.has(hash)) {
      console.log(`  • ${base} — already in gallery, skipping`);
      continue;
    }

    let dim;
    try {
      dim = imageSize(buf);
    } catch {
      console.warn(`  • ${base} — couldn't read dimensions, skipping`);
      continue;
    }

    const { width, height } = displayDimensions(dim);
    const orientation =
      width === height ? "square" : width > height ? "landscape" : "portrait";
    const target = orientation === "portrait" ? "mobile" : "desktop";

    const ext = path.extname(file).toLowerCase();
    const key = `gallery/${hash}-${sanitize(base)}${ext}`;

    const { url } = await put(key, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType: dim.type ? `image/${dim.type}` : undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    manifest.push({
      src: url,
      hash,
      width,
      height,
      orientation,
      target,
      alt: sanitize(base).replace(/-/g, " ") || "gallery photo",
      addedAt: today,
    });
    seen.add(hash);
    added++;
    console.log(`  ✓ ${base} → ${orientation} (${target})`);
  }

  if (added === 0) {
    console.log("\nNothing new to add.\n");
    return;
  }

  // Newest first.
  manifest.sort((a, b) => (a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0));
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nAdded ${added} photo(s) to the gallery (${manifest.length} total).`);

  if (noCommit) {
    console.log("--no-commit set; manifest updated but not committed.\n");
    return;
  }

  try {
    const rel = path.relative(process.cwd(), MANIFEST_PATH);
    execFileSync("git", ["add", rel], { stdio: "inherit" });
    execFileSync(
      "git",
      ["commit", "-m", `Add ${added} photo(s) to gallery`],
      { stdio: "inherit" }
    );
    execFileSync("git", ["push", "origin", "main"], { stdio: "inherit" });
    console.log("\nPushed to prod. ✦\n");
  } catch {
    console.warn(
      "\nManifest saved, but the git commit/push didn't complete — commit it manually.\n"
    );
  }
})();
