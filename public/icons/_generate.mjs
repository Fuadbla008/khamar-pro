/**
 * Regenerates the Khamar PWA icons with Node built-ins only.
 * Run: node public/icons/_generate.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const SCALE = 3; // supersampling for smooth edges
const GREEN = [27, 127, 75];
const WHITE = [255, 255, 255];

/* ---------- PNG encoding ---------- */

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Tiny rasteriser ---------- */

function blend(pixels, size, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
  const i = (y * size + x) * 4;
  const a = Math.min(1, alpha) * (color[3] ?? 1);
  pixels[i] = pixels[i] * (1 - a) + color[0] * a;
  pixels[i + 1] = pixels[i + 1] * (1 - a) + color[1] * a;
  pixels[i + 2] = pixels[i + 2] * (1 - a) + color[2] * a;
  pixels[i + 3] = Math.max(pixels[i + 3], a * 255);
}

function roundedRectCoverage(x, y, size, radius) {
  if (radius <= 0) return 1;
  const dx = Math.max(Math.abs(x - size / 2) - (size / 2 - radius), 0);
  const dy = Math.max(Math.abs(y - size / 2) - (size / 2 - radius), 0);
  return Math.min(1, Math.max(0, radius - Math.hypot(dx, dy) + 0.5));
}

function inTriangle(x, y, points) {
  const [a, b, c] = points;
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (d === 0) return false;
  const w1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
  const w2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
  const w3 = 1 - w1 - w2;
  return w1 >= 0 && w2 >= 0 && w3 >= 0;
}

function drawMark(pixels, size, scale, color) {
  // Map a normalised coordinate into the (possibly shrunken) safe zone.
  const at = (nx, ny) => [(nx - 0.5) * scale + 0.5, (ny - 0.5) * scale + 0.5];
  const rect = (x1, y1, x2, y2) => {
    const [ax, ay] = at(x1, y1);
    const [bx, by] = at(x2, y2);
    return [ax * size, ay * size, bx * size, by * size];
  };

  const [left, top, right, bottom] = rect(0.3, 0.44, 0.7, 0.73);
  const [doorLeft, doorTop, doorRight, doorBottom] = rect(0.45, 0.56, 0.55, 0.73);
  const [sunX, sunY] = at(0.72, 0.27);
  const sunR = 0.09 * scale * size;
  const roof = [at(0.22, 0.47), at(0.5, 0.24), at(0.78, 0.47)].map(([x, y]) => [
    x * size,
    y * size,
  ]);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let inside =
        (x >= left && x < right && y >= top && y < bottom) ||
        inTriangle(x + 0.5, y + 0.5, roof) ||
        Math.hypot(x + 0.5 - sunX * size, y + 0.5 - sunY * size) <= sunR;
      if (inside) {
        blend(pixels, size, x, y, color);
        if (
          x >= doorLeft &&
          x < doorRight &&
          y >= doorTop &&
          y < doorBottom
        ) {
          blend(pixels, size, x, y, GREEN);
        }
      }
    }
  }
}

function renderIcon(targetSize, maskable) {
  const size = targetSize * SCALE;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const markScale = maskable ? 0.8 : 1;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const coverage = roundedRectCoverage(x + 0.5, y + 0.5, size, radius);
      if (coverage > 0) blend(pixels, size, x, y, GREEN, coverage);
    }
  }
  drawMark(pixels, size, markScale, WHITE);

  const out = Buffer.alloc(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < SCALE; dy += 1) {
        for (let dx = 0; dx < SCALE; dx += 1) {
          const i = ((y * SCALE + dy) * size + x * SCALE + dx) * 4;
          const alpha = pixels[i + 3] / 255;
          r += pixels[i] * alpha;
          g += pixels[i + 1] * alpha;
          b += pixels[i + 2] * alpha;
          a += alpha;
        }
      }
      const o = (y * targetSize + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = (a / (SCALE * SCALE)) * 255;
    }
  }
  return encodePng(targetSize, out);
}

mkdirSync(OUT_DIR, { recursive: true });
const icons = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
];
for (const [name, size, maskable] of icons) {
  writeFileSync(join(OUT_DIR, name), renderIcon(size, maskable));
  console.log(`wrote ${name} (${size}x${size}${maskable ? ", maskable" : ""})`);
}
