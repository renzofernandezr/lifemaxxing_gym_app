// Genera los pitidos del descanso (WAV PCM 16 bits, mono) como en el prototipo: 660 Hz corto y 990 Hz largo.
import { writeFileSync } from "node:fs";

function wav(freq, seconds, file) {
  const rate = 22050;
  const n = Math.floor(rate * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const attack = Math.min(1, t / 0.01);
    const release = Math.exp(-4 * (t / seconds));
    const v = Math.sin(2 * Math.PI * freq * t) * 0.3 * attack * release;
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(`../assets/sounds/${file}`, import.meta.url), buf);
}
wav(660, 0.09, "beep-short.wav");
wav(990, 0.4, "beep-long.wav");
