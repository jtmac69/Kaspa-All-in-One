'use strict';

/**
 * create-placeholder-icons.js
 *
 * Generates placeholder icon assets (icon.png, icon.ico) using only Node.js
 * built-ins — no external dependencies required.
 *
 * Used by CI when real brand icons are not present. Replace these files with
 * production-quality icons before a public release.
 *
 * Kaspa brand teal: rgb(73, 234, 203)  #49EACB
 *
 * For macOS icon.icns, run this script first to generate icon.png, then use
 * the macOS-only iconutil (via the create-icns.sh helper or the CI workflow step).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// ─── CRC-32 (ISO 3309) ────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG builder ─────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size, r, g, b) {
  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Raw image data: one filter byte (0=None) per row, then RGB pixels
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── ICO builder (embeds PNG data directly — supported on Windows Vista+) ───

function createIco(pngData) {
  // ICONDIR header (6 bytes): reserved=0, type=1 (icon), count=1
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);
  iconDir.writeUInt16LE(1, 2);
  iconDir.writeUInt16LE(1, 4);

  // ICONDIRENTRY (16 bytes): width=0(→256), height=0(→256), colors=0, reserved=0, planes=0, bpp=32, size, offset=22
  const entry = Buffer.alloc(16);
  entry[0] = 0;  // width: 0 means 256
  entry[1] = 0;  // height: 0 means 256
  entry[2] = 0;  // color count (0 = no palette)
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(0, 4);              // planes
  entry.writeUInt16LE(32, 6);             // bits per pixel
  entry.writeUInt32LE(pngData.length, 8); // bytes in image data
  entry.writeUInt32LE(22, 12);            // offset = 6 (ICONDIR) + 16 (ICONDIRENTRY)

  return Buffer.concat([iconDir, entry, pngData]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(ASSETS_DIR, { recursive: true });

const PNG_PATH = path.join(ASSETS_DIR, 'icon.png');
const ICO_PATH = path.join(ASSETS_DIR, 'icon.ico');

// Kaspa teal: #49EACB = rgb(73, 234, 203)
const pngData = createPng(256, 73, 234, 203);

if (!fs.existsSync(PNG_PATH)) {
  fs.writeFileSync(PNG_PATH, pngData);
  console.log('Created placeholder: assets/icon.png  (256×256 Kaspa teal)');
} else {
  console.log('Skipped: assets/icon.png already exists');
}

if (!fs.existsSync(ICO_PATH)) {
  fs.writeFileSync(ICO_PATH, createIco(pngData));
  console.log('Created placeholder: assets/icon.ico  (256×256, PNG-embedded)');
} else {
  console.log('Skipped: assets/icon.ico already exists');
}

console.log('');
console.log('Note: assets/icon.icns (macOS) requires macOS iconutil.');
console.log('      In CI, the release workflow handles this automatically.');
console.log('      Locally on macOS, run:  npm run icons:icns');
