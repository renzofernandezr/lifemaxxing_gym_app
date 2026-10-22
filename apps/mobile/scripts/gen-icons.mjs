// Genera los íconos de la app (disco naranja del prototipo) como PNG, sin dependencias.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ACCENT = hex("#FF6600");
const BG = hex("#252C2E");
const WHITE = hex("#FFFFFF"); // fondo de los íconos de iOS y Android

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** `alpha: false` → PNG RGB sin canal alfa (App Store Connect lo exige en el ícono de iOS). */
function png(size, pixel, { alpha = true } = {}) {
  const bpp = alpha ? 4 : 3;
  const raw = Buffer.alloc((size * bpp + 1) * size);
  const S = 4; // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * bpp + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const [pr, pg, pb, pa] = pixel((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size);
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
      }
      const o = y * (size * bpp + 1) + 1 + x * bpp;
      raw[o] = a ? Math.round(r / a) : 0; raw[o + 1] = a ? Math.round(g / a) : 0; raw[o + 2] = a ? Math.round(b / a) : 0;
      if (alpha) raw[o + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/** Disco: radio R, anillo interior (naranja mezclado con `ringWith`) y agujero central del color `hole`. */
function plate(R, hole, bg, ringWith = hole) {
  return (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5);
    const ring = Math.abs(d - R * 0.74) < R * 0.035;
    if (d <= R * 0.25) return hole ? [...hole, 1] : bg ? [...bg, 1] : [0, 0, 0, 0];
    if (d <= R) return ring ? [...ACCENT.map((c, i) => Math.round(c * 0.55 + (ringWith ?? [255, 255, 255])[i] * 0.45)), 1] : [...ACCENT, 1];
    return bg ? [...bg, 1] : [0, 0, 0, 0];
  };
}
const out = (f, buf) => writeFileSync(new URL(`../assets/images/${f}`, import.meta.url), buf);
out("icon.png", png(1024, plate(0.36, WHITE, WHITE, BG)));
out("icon-ios.png", png(1024, plate(0.36, WHITE, WHITE, BG), { alpha: false }));
out("splash-icon.png", png(512, plate(0.48, hex("#F5F5F5"), null)));
out("favicon.png", png(48, plate(0.47, BG, null)));
out("android-icon-foreground.png", png(1024, plate(0.3, null, null, BG)));
out("android-icon-background.png", png(1024, () => [...WHITE, 1]));
out("android-icon-monochrome.png", png(1024, (u, v) => (Math.hypot(u - 0.5, v - 0.5) <= 0.3 && Math.hypot(u - 0.5, v - 0.5) > 0.075 ? [255, 255, 255, 1] : [0, 0, 0, 0])));
console.log("Íconos generados");
