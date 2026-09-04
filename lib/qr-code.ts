// Vendored encoder: qrcode-generator by Kazuhiko Arase (MIT), see lib/vendor/LICENSE-qrcode-generator.txt.
import qrcode from './vendor/qrcode.mjs';
import { stringToBytes } from './vendor/qrcode_UTF8.mjs';

type QR = { addData(value: string): void; make(): void; createDataURL(cellSize?: number, margin?: number): string; createSvgTag(cellSize?: number, margin?: number): string };

export function qrDataUrl(value: string, cellSize = 4, margin = 8): string {
  if (!value || value.length > 1800) throw new Error('Tautan verifikasi terlalu panjang untuk QR. Persingkat isi sertifikat.');
  qrcode.stringToBytes = stringToBytes;
  const code = qrcode(0, 'M') as QR;
  code.addData(value);
  code.make();
  return code.createDataURL(cellSize, margin);
}

export function qrSvg(value: string): string {
  qrcode.stringToBytes = stringToBytes;
  const code = qrcode(0, 'M') as QR;
  code.addData(value);
  code.make();
  return code.createSvgTag(4, 4);
}
