export interface BarcodeScanListenerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Attaches a global keyboard listener for USB / Bluetooth hardware barcode scanner guns.
 * Barcode guns type rapid key events followed by 'Enter'.
 */
export function setupHardwareBarcodeScanner(options: BarcodeScanListenerOptions): () => void {
  const { onScan, minChars = 3, maxIntervalMs = 60 } = options;
  let buffer = '';
  let lastKeyTime = 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

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
      if (code.length >= minChars) {
        e.preventDefault();
        onScan(code);
      }
      buffer = '';
      return;
    }

    if (e.key.length === 1) {
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
 * Native BarcodeDetector for live camera detection
 */
export class CameraBarcodeScanner {
  private isScanning = false;
  private scanIntervalTimer: number | null = null;
  private detector: any = null;

  constructor() {
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        this.detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf']
        });
      } catch (err) {
        console.warn('BarcodeDetector format init notice:', err);
      }
    }
  }

  public startScan(
    videoElement: HTMLVideoElement,
    onDetected: (code: string) => void,
    intervalMs = 350
  ): void {
    if (this.isScanning) return;
    this.isScanning = true;

    this.scanIntervalTimer = window.setInterval(async () => {
      if (!this.isScanning || !videoElement || videoElement.readyState < 2) return;

      if (this.detector) {
        try {
          const barcodes = await this.detector.detect(videoElement);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw.trim()) {
              onDetected(raw.trim());
            }
          }
        } catch {
          // ignore transient detection drops
        }
      }
    }, intervalMs);
  }

  public stopScan(): void {
    this.isScanning = false;
    if (this.scanIntervalTimer) {
      clearInterval(this.scanIntervalTimer);
      this.scanIntervalTimer = null;
    }
  }
}
