import React, { useState, useRef, useEffect } from 'react';
import { Scan, Play, Camera, CheckCircle2 } from 'lucide-react';

interface ManualBarcodeInputProps {
  theme: 'dark' | 'light';
  onScanAndStart: (barcode: string) => void;
  isRecording: boolean;
  cameraScannerActive: boolean;
  onToggleCameraScanner: () => void;
}

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
  theme,
  onScanAndStart,
  isRecording,
  cameraScannerActive,
  onToggleCameraScanner,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus input when ready for next scan
  useEffect(() => {
    if (!isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecording]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (code) {
      onScanAndStart(code);
      setBarcodeInput('');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`border rounded-2xl p-4 shadow-xl transition-colors ${
        isDark
          ? 'bg-zinc-900/90 border-zinc-800 text-white'
          : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              isDark
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              Barcode Scanner
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-normal border ${
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Gun Ready
              </span>
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Scan barcode with USB gun or enter code below to start recording
            </p>
          </div>
        </div>

        {/* Toggle Live Camera Barcode Reader */}
        <button
          type="button"
          onClick={onToggleCameraScanner}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
            cameraScannerActive
              ? isDark
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
              : isDark
              ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-white'
              : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900'
          }`}
        >
          <Camera className={`w-3.5 h-3.5 ${cameraScannerActive ? 'animate-pulse text-amber-500' : ''}`} />
          {cameraScannerActive ? 'Camera Scanner: Active' : 'Camera Barcode Scan'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Scan className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={isRecording}
            placeholder={isRecording ? 'Recording active...' : 'Scan barcode or enter barcode number...'}
            className={`barcode-scanner-target w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 ${
              isDark
                ? 'bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500'
                : 'bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
          {barcodeInput && (
            <button
              type="button"
              onClick={() => setBarcodeInput('')}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center text-xs ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isRecording || !barcodeInput.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Record
        </button>
      </form>
    </div>
  );
};
