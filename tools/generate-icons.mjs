// Genera los íconos PNG de la app (PWA y pantalla de inicio de iOS) sin dependencias.
// Dibuja el mismo diseño que assets/icons/favicon.svg: cuadrado lima redondeado con una "N".
//
// Uso: node tools/generate-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const LIME = [0xc6, 0xf4, 0x32];
const INK = [0x0b, 0x0c, 0x0d];
// Trazo de la "N" en una grilla de 32×32 (igual que el SVG)
const N_PATH = [[10, 23], [10, 9], [22, 23], [22, 9]];
const STROKE = 3.2;

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function insideRoundedRect(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/**
 * maskable: fondo a sangre completa y glifo más chico (zona segura de Android).
 * Devuelve los píxeles RGBA con antialiasing por supermuestreo 4×4.
 */
function draw(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const glyphScale = maskable ? 0.62 : 1;
  const unit = (size / 32) * glyphScale;
  const offset = (size - 32 * unit) / 2;
  const radius = size * (9 / 32);
  const SS = 4;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bg = 0;
      let ink = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (!maskable && !insideRoundedRect(px, py, size, radius)) continue;
          bg += 1;
          const gx = (px - offset) / unit;
          const gy = (py - offset) / unit;
          const d = Math.min(...N_PATH.slice(1).map((p, i) => distanceToSegment(gx, gy, N_PATH[i], p)));
          if (d <= STROKE / 2) ink += 1;
        }
      }
      const total = SS * SS;
      const i = (y * size + x) * 4;
      const inkRatio = bg ? ink / bg : 0;
      for (let c = 0; c < 3; c += 1) pixels[i + c] = Math.round(LIME[c] * (1 - inkRatio) + INK[c] * inkRatio);
      pixels[i + 3] = Math.round((bg / total) * 255);
    }
  }
  return pixels;
}

// ---------- Codificador PNG mínimo ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0; // sin filtro
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const icons = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }], // iOS recorta las esquinas por su cuenta
];
for (const [name, size, options] of icons) {
  writeFileSync(new URL(name, `file:///${OUT.replaceAll('\\', '/')}`), encodePng(size, draw(size, options)));
  console.log(`✓ ${name}`);
}
