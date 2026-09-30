import React, { useState, useRef, useEffect } from 'react';
import { Scan, Play, Camera, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ManualBarcodeInputProps {
  onScanAndStart: (barcode: string) => void;
  isRecording: boolean;
  cameraScannerActive: boolean;
  onToggleCameraScanner: () => void;
}

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
  onScanAndStart,
  isRecording,
  cameraScannerActive,
  onToggleCameraScanner,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input automatically so hardware barcode gun inputs instantly register
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

  const setSampleBarcode = (code: string) => {
    setBarcodeInput(code);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Barcode Scanner Gun & Input
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                <CheckCircle2 className="w-3 h-3" /> Scanner Ready
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Point USB/Bluetooth scanner at barcode, or type & press Enter to start recording
            </p>
          </div>
        </div>

        {/* Toggle Live Camera Barcode Reader */}
        <button
          type="button"
          onClick={onToggleCameraScanner}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
            cameraScannerActive
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-white'
          }`}
        >
          <Camera className={`w-3.5 h-3.5 ${cameraScannerActive ? 'animate-pulse text-amber-400' : ''}`} />
          {cameraScannerActive ? 'Camera Scanner: Active' : 'Enable Camera Barcode Scan'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Scan className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={isRecording}
            placeholder={isRecording ? 'Recording active for current barcode...' : 'Scan barcode or enter tracking number (e.g. SDLC1078691604)...'}
            className="barcode-scanner-target w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 transition"
          />
          {barcodeInput && (
            <button
              type="button"
              onClick={() => setBarcodeInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isRecording || !barcodeInput.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          Scan & Record
        </button>
      </form>

      {/* Quick Test Barcodes Row */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/80 text-xs">
        <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
          <Sparkles className="w-3 h-3 text-emerald-400" /> Quick Samples:
        </span>
        {[
          { code: 'SDLC1078691604', label: 'Snapdeal Parcel (Video Sample)' },
          { code: 'FMPC2091847192', label: 'Flipkart AWB' },
          { code: 'AMZN4928104812', label: 'Amazon Packet' },
          { code: 'MSHO7710294819', label: 'Meesho Order' },
        ].map((item) => (
          <button
            key={item.code}
            type="button"
            disabled={isRecording}
            onClick={() => setSampleBarcode(item.code)}
            className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-300 text-[11px] font-mono transition disabled:opacity-50"
            title={`Click to load barcode: ${item.code}`}
          >
            {item.code}
          </button>
        ))}
      </div>
    </div>
  );
};
