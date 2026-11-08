import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// Keep the approved OGAS TV red wordmark pixel-perfect. The archive source
// contains an obsolete subtitle, but it is never exposed in public/.
const source = join(process.cwd(), 'assets', 'ogastv-wordmark-source.png');
const destination = join(process.cwd(), 'public', 'ogastv-nigeria-logo.png');
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

let lastRedPixelRow = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a > 40 && r > 80 && r > g * 1.4 && r > b * 1.4) lastRedPixelRow = y;
  }
}
if (lastRedPixelRow < 0 || lastRedPixelRow > height - 29) {
  throw new Error('The approved OgasTV source wordmark has an unexpected shape.');
}
const wordmark = await sharp(source).extract({
  left: 0, top: 0, width, height: lastRedPixelRow + 2,
}).ensureAlpha().png().toBuffer();

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
  '<text x="' + width / 2 + '" y="' + Math.round(height * 0.89) +
  '" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="' + Math.round(height * 0.21) +
  '" font-weight="700" letter-spacing="' + Math.round(width * 0.014) +
  '" fill="#000000">NIGERIA</text></svg>';

await mkdir(dirname(destination), { recursive: true });
await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: wordmark, left: 0, top: 0 }, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png({ palette: true, effort: 10 })
  .toFile(destination);
console.log('Generated approved OgasTV Nigeria logo: ' + width + 'x' + height);
