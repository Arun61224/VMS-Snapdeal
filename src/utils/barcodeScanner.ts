import { BrowserMultiFormatReader } from '@zxing/browser';

export interface BarcodeScanListenerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Attaches a global keyboard listener for USB / Bluetooth hardware barcode scanner guns.
 * Barcode scanner guns emit keystrokes quickly followed by 'Enter'.
 */
export function setupHardwareBarcodeScanner(options: BarcodeScanListenerOptions): () => void {
  const { onScan, minChars = 3, maxIntervalMs = 50 } = options;
  let buffer = '';
  let lastKeyTime = 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore function keys, control combinations, etc.
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Check if user is typing into an input field or textarea that is not specifically the scanner input
    const target = e.target as HTMLElement | null;
    const isEditingText =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
      !target.classList.contains('barcode-scanner-target');

    const now = Date.now();
    const interval = now - lastKeyTime;
    lastKeyTime = now;

    if (e.key === 'Enter') {
      const code = buffer.trim();
      // If we accumulated characters quickly, or we have a valid buffered barcode
      if (code.length >= minChars) {
        e.preventDefault();
        onScan(code);
      }
      buffer = '';
      return;
    }

    if (e.key.length === 1) {
      // If time between keystrokes was too long, reset the buffer (unless it was the first key)
      if (buffer.length > 0 && interval > maxIntervalMs && !isEditingText) {
        buffer = '';
      }

      if (!isEditingText) {
        buffer += e.key;
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
  };
}

/**
 * Helper to decode barcode from HTMLVideoElement or HTMLCanvasElement using ZXing
 */
export class CameraBarcodeScanner {
  private reader: BrowserMultiFormatReader | null = null;
  private controls: { stop: () => void } | null = null;
  private isScanning = false;
  private scanIntervalTimer: number | null = null;

  constructor() {
    try {
      this.reader = new BrowserMultiFormatReader();
    } catch (e) {
      console.warn('Failed to initialize ZXing reader:', e);
    }
  }

  public startScan(
    videoElement: HTMLVideoElement,
    onDetected: (code: string) => void,
    intervalMs = 350
  ): void {
    if (this.isScanning) return;
    this.isScanning = true;

    // Native BarcodeDetector check if supported in Chromium
    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
    let nativeDetector: any = null;

    if (hasNativeBarcodeDetector) {
      try {
        // @ts-ignore
        nativeDetector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf']
        });
      } catch (err) {
        console.warn('Native BarcodeDetector init failed', err);
      }
    }

    if (nativeDetector) {
      this.scanIntervalTimer = window.setInterval(async () => {
        if (!this.isScanning || !videoElement || videoElement.readyState < 2) return;
        try {
          const barcodes = await nativeDetector.detect(videoElement);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw.trim()) {
              onDetected(raw.trim());
            }
          }
        } catch {
          // ignore detection frame drops
        }
      }, intervalMs);
    } else if (this.reader) {
      try {
        this.controls = this.reader.decodeFromVideoElement(
          videoElement,
          (result, _error) => {
            if (!this.isScanning) return;
            if (result) {
              const text = result.getText();
              if (text && text.trim()) {
                onDetected(text.trim());
              }
            }
          }
        );
      } catch (e) {
        console.warn('Error starting ZXing video scanner:', e);
      }
    }
  }

  public stopScan(): void {
    this.isScanning = false;
    if (this.scanIntervalTimer) {
      clearInterval(this.scanIntervalTimer);
      this.scanIntervalTimer = null;
    }
    if (this.controls) {
      try {
        this.controls.stop();
      } catch {
        // ignore
      }
      this.controls = null;
    }
  }
}
