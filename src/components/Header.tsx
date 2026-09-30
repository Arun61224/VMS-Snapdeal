import React from 'react';
import { TimestampConfig, AppSettings } from '../types';
import { Video, Clock, Settings, Volume2, VolumeX, Download, Layers, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  timestampConfig: TimestampConfig;
  appSettings: AppSettings;
  onOpenTimestampModal: () => void;
  onUpdateAppSettings: (newSettings: Partial<AppSettings>) => void;
  totalSavedVideos: number;
}

export const Header: React.FC<HeaderProps> = ({
  timestampConfig,
  appSettings,
  onOpenTimestampModal,
  onUpdateAppSettings,
  totalSavedVideos,
}) => {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800/80 sticky top-0 z-30 px-4 lg:px-8 py-3 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Branding & Station Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wider flex items-center gap-2">
                  ScanVMS
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Packaging Proof
                  </span>
                </h1>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{timestampConfig.stationText || 'Packaging Station-01'}</span>
                {timestampConfig.operatorName && (
                  <span className="text-zinc-500">· Op: {timestampConfig.operatorName}</span>
                )}
              </p>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onOpenTimestampModal}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
              title="Timestamp Settings"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Top Control Badges */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto text-xs">
          {/* Timestamp Editor Button */}
          <button
            type="button"
            onClick={onOpenTimestampModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Timestamp</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              {timestampConfig.mode === 'realtime' ? 'Live' : 'Custom'}
            </span>
          </button>

          {/* Auto Download Toggle */}
          <button
            type="button"
            onClick={() => onUpdateAppSettings({ autoDownloadOnStop: !appSettings.autoDownloadOnStop })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              appSettings.autoDownloadOnStop
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
            title="Automatically download video to your computer when Stop is pressed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Auto-Download:</span>
            <span className="font-bold">{appSettings.autoDownloadOnStop ? 'ON' : 'OFF'}</span>
          </button>

          {/* Audio Beep Feedback Toggle */}
          <button
            type="button"
            onClick={() => onUpdateAppSettings({ scannerBeep: !appSettings.scannerBeep })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition ${
              appSettings.scannerBeep
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
            }`}
            title="Barcode Scanner Beep and Audio feedback"
          >
            {appSettings.scannerBeep ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Scanner Beep</span>
          </button>

          {/* Archive Count badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Archive:</span>
            <span className="font-bold text-white font-mono">{totalSavedVideos}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
