/**
 * OCR interface
 * Production adapters: Tesseract, Google Vision, AWS Textract, Azure Document Intelligence.
 * This module defines the contract; implementations plug in without changing callers.
 */

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  blocks?: Array<{ text: string; bbox?: number[]; confidence?: number }>;
}

export interface OcrDocumentResult {
  pages: OcrPageResult[];
  fullText: string;
  averageConfidence: number;
  engine: string;
  warnings: string[];
}

export interface OcrAdapter {
  name: string;
  extractText(input: { buffer?: Buffer; path?: string; mimeType?: string }): Promise<OcrDocumentResult>;
}

/**
 * Passthrough adapter for already-digitized text / testing.
 */
export const passthroughOcr: OcrAdapter = {
  name: 'passthrough',
  async extractText() {
    return {
      pages: [],
      fullText: '',
      averageConfidence: 0,
      engine: 'passthrough',
      warnings: ['No binary OCR performed — provide textContent or configure a production OCR adapter.'],
    };
  },
};

let activeAdapter: OcrAdapter = passthroughOcr;

export function setOcrAdapter(adapter: OcrAdapter) {
  activeAdapter = adapter;
}

export function getOcrAdapter(): OcrAdapter {
  return activeAdapter;
}

export async function runOcr(input: { buffer?: Buffer; path?: string; mimeType?: string }): Promise<OcrDocumentResult> {
  return activeAdapter.extractText(input);
}
