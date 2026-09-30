import React, { useState } from 'react';
import { TimestampConfig } from '../types';
import { formatDateTime } from '../utils/timestampRenderer';
import { X, Clock, Palette, Layout, Check, RotateCcw, Sliders } from 'lucide-react';

interface TimestampEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TimestampConfig;
  onSave: (newConfig: TimestampConfig) => void;
}

export const TimestampEditorModal: React.FC<TimestampEditorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<TimestampConfig>({ ...config });

  if (!isOpen) return null;

  // Compute preview string
  let previewDate = new Date();
  if (formData.mode === 'custom_fixed' && formData.customDateTime) {
    previewDate = new Date(formData.customDateTime);
  } else if (formData.mode === 'custom_offset') {
    previewDate.setMinutes(previewDate.getMinutes() + formData.offsetMinutes);
  }
  const { dateStr, timeStr } = formatDateTime(previewDate, formData);

  const handleResetDefaults = () => {
    setFormData({
      mode: 'realtime',
      customDateTime: new Date().toISOString().slice(0, 19),
      offsetMinutes: 0,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      showSeconds: true,
      showMilliseconds: true,
      stationText: 'PACKING STATION-01',
      operatorName: '',
      position: 'top-left',
      fontSize: 20,
      textColor: '#00ff66',
      bgColor: 'rgba(0,0,0,0.65)',
      showBarcodeWatermark: true,
      showRecBlinker: true,
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Customize Timestamp & Date Stamp</h2>
              <p className="text-xs text-zinc-400">Configure time format, custom values, and CCTV overlay style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Banner */}
        <div className="p-5 border-b border-zinc-800 bg-black/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Burn-in Overlay Preview
            </span>
            <span className="text-[11px] text-zinc-400">Position: {formData.position}</span>
          </div>
          <div className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl border border-zinc-700 p-3 overflow-hidden flex flex-col justify-center">
            {/* Mock background items to show transparency and contrast */}
            <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-around">
              <div className="w-20 h-16 border border-dashed border-zinc-500 rounded flex items-center justify-center text-[10px] text-zinc-400">PARCEL</div>
              <div className="w-24 h-20 border border-dashed border-zinc-500 rounded flex items-center justify-center text-[10px] text-zinc-400">SHIPPING BOX</div>
            </div>

            {/* Rendered stamp preview */}
            <div
              className={`max-w-max rounded px-3 py-2 border transition-all ${
                formData.position === 'top-right' ? 'self-end' :
                formData.position === 'bottom-left' ? 'self-start mt-auto' :
                formData.position === 'bottom-right' ? 'self-end mt-auto' : 'self-start'
              }`}
              style={{
                backgroundColor: formData.bgColor === 'transparent' ? 'transparent' : formData.bgColor,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <div
                className="font-mono font-bold leading-tight drop-shadow"
                style={{
                  color: formData.textColor,
                  fontSize: `${Math.max(12, Math.round(formData.fontSize * 0.75))}px`,
                }}
              >
                <div>{dateStr}  {timeStr}</div>
                {(formData.stationText || formData.operatorName) && (
                  <div className="text-[11px] opacity-90">
                    {[formData.stationText, formData.operatorName ? `OP: ${formData.operatorName}` : ''].filter(Boolean).join(' | ')}
                  </div>
                )}
                {formData.showBarcodeWatermark && (
                  <div className="text-[11px] text-emerald-400 opacity-90">
                    PKG BARCODE: [ SDLC1078691604 ]
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Timestamp Source Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'realtime' })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formData.mode === 'realtime'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Real-time Clock</span>
                  {formData.mode === 'realtime' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-xs text-zinc-400">Current system date & time</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'custom_fixed' })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formData.mode === 'custom_fixed'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Custom Date/Time</span>
                  {formData.mode === 'custom_fixed' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-xs text-zinc-400">Specify exact time or date</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'custom_offset' })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formData.mode === 'custom_offset'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Time Offset (+/-)</span>
                  {formData.mode === 'custom_offset' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-xs text-zinc-400">Shift forward or backward</span>
              </button>
            </div>

            {/* If Custom Date/Time selected */}
            {formData.mode === 'custom_fixed' && (
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col gap-2 animate-in fade-in">
                <label className="text-xs text-zinc-300 font-medium">Select Starting Date & Time</label>
                <input
                  type="datetime-local"
                  step="1"
                  value={formData.customDateTime ? formData.customDateTime.slice(0, 19) : ''}
                  onChange={(e) => setFormData({ ...formData, customDateTime: e.target.value })}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
                <span className="text-[11px] text-zinc-400">
                  * Time will naturally advance second-by-second starting from this timestamp during recording.
                </span>
              </div>
            )}

            {/* If Offset selected */}
            {formData.mode === 'custom_offset' && (
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col gap-2 animate-in fade-in">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-zinc-300 font-medium">Time Offset in Minutes</label>
                  <span className="font-mono text-emerald-400">
                    {formData.offsetMinutes > 0 ? `+${formData.offsetMinutes}` : formData.offsetMinutes} mins
                  </span>
                </div>
                <input
                  type="range"
                  min="-720"
                  max="720"
                  step="5"
                  value={formData.offsetMinutes}
                  onChange={(e) => setFormData({ ...formData, offsetMinutes: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>-12 Hours</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, offsetMinutes: 0 })}
                    className="hover:underline text-emerald-400"
                  >
                    Reset (0)
                  </button>
                  <span>+12 Hours</span>
                </div>
              </div>
            )}
          </div>

          {/* Formats & Display Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">Date Format</label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-30)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 30/09/2026)</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 30-09-2026)</option>
                <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 30-Sep-2026)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">Time Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '24h' })}
                  className={`py-2 px-3 rounded-xl border text-center text-sm font-medium transition ${
                    formData.timeFormat === '24h'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  24-Hour (14:30)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '12h' })}
                  className={`py-2 px-3 rounded-xl border text-center text-sm font-medium transition ${
                    formData.timeFormat === '12h'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  12-Hour AM/PM
                </button>
              </div>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-zinc-700">
              <span className="text-xs font-medium text-zinc-300">Show Milliseconds (CCTV Precision)</span>
              <input
                type="checkbox"
                checked={formData.showMilliseconds}
                onChange={(e) => setFormData({ ...formData, showMilliseconds: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-zinc-700">
              <span className="text-xs font-medium text-zinc-300">Show Seconds</span>
              <input
                type="checkbox"
                checked={formData.showSeconds}
                onChange={(e) => setFormData({ ...formData, showSeconds: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-zinc-700">
              <span className="text-xs font-medium text-zinc-300">Burn Barcode Number on Frame</span>
              <input
                type="checkbox"
                checked={formData.showBarcodeWatermark}
                onChange={(e) => setFormData({ ...formData, showBarcodeWatermark: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-zinc-700">
              <span className="text-xs font-medium text-zinc-300">Show REC Blinking Pill</span>
              <input
                type="checkbox"
                checked={formData.showRecBlinker}
                onChange={(e) => setFormData({ ...formData, showRecBlinker: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>
          </div>

          {/* Station & Operator Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Station / Warehouse Tag
              </label>
              <input
                type="text"
                placeholder="e.g. PACKING STATION-01"
                value={formData.stationText}
                onChange={(e) => setFormData({ ...formData, stationText: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Operator / Packer Name
              </label>
              <input
                type="text"
                placeholder="e.g. Amit Kumar"
                value={formData.operatorName}
                onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Overlay Position & Appearance */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Position & Appearance
            </label>

            {/* Position 4-corners picker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'bottom-right', label: 'Bottom Right' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, position: pos.id as any })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                    formData.position === pos.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>

            {/* Color Palette */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-xs text-zinc-400 block mb-1.5">Text Color</span>
                <div className="flex items-center gap-2">
                  {[
                    { color: '#00ff66', name: 'CCTV Green' },
                    { color: '#ffffff', name: 'White' },
                    { color: '#ffff00', name: 'Yellow' },
                    { color: '#00e5ff', name: 'Cyan' },
                    { color: '#f97316', name: 'Amber' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setFormData({ ...formData, textColor: c.color })}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        formData.textColor === c.color ? 'scale-110 border-white' : 'border-zinc-700 opacity-80'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Background Box Style */}
              <div className="flex-1">
                <span className="text-xs text-zinc-400 block mb-1.5">Background Style</span>
                <div className="flex items-center gap-2">
                  {[
                    { val: 'rgba(0,0,0,0.65)', label: 'Dark Box (Recommended)' },
                    { val: '#000000', label: 'Solid Black' },
                    { val: 'transparent', label: 'Transparent' },
                  ].map((b) => (
                    <button
                      key={b.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, bgColor: b.val })}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                        formData.bgColor === b.val
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Font Size slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-zinc-400">Overlay Font Size</span>
                <span className="font-mono text-zinc-200">{formData.fontSize}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="36"
                step="2"
                value={formData.fontSize}
                onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard CCTV
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
            >
              <Check className="w-4 h-4" />
              Apply & Save Timestamp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
