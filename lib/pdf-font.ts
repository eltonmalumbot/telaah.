import { PDF_FONT_RANGES } from './pdf-font-coverage.ts';

let fontPromise: Promise<string> | undefined;

/** Only the public font asset is fetched; response content stays in the browser. */
export function loadReportFont(): Promise<string> {
  fontPromise ??= fetch('/fonts/DejaVuSans.ttf').then(async response => {
    if (!response.ok) throw new Error('Font laporan gagal dimuat. Periksa koneksi dan coba lagi.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }).catch(error => {
    fontPromise = undefined;
    throw error;
  });
  return fontPromise;
}

/** Unsupported glyphs retain a readable, reversible codepoint instead of disappearing. */
export function reportText(value: string): string {
  return Array.from(value.replace(/\r\n?/g, '\n').replace(/\t/g, '    '), char => {
    const point = char.codePointAt(0)!;
    if (char === '\n' || PDF_FONT_RANGES.some(([start, end]) => point >= start && point <= end)) return char;
    return `[U+${point.toString(16).toUpperCase().padStart(4, '0')}]`;
  }).join('');
}

