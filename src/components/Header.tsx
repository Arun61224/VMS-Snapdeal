import React from 'react';
import { TimestampConfig, AppSettings } from '../types';
import { Video, Clock, Volume2, VolumeX, Download, Sun, Moon, Layers } from 'lucide-react';

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
  const isDark = appSettings.theme === 'dark';

  const toggleTheme = () => {
    onUpdateAppSettings({ theme: isDark ? 'light' : 'dark' });
  };

  return (
    <header
      className={`border-b sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 backdrop-blur-md transition-colors ${
        isDark ? 'bg-zinc-950/90 border-zinc-800/80 text-white' : 'bg-white/90 border-zinc-200 text-zinc-900 shadow-sm'
      }`}
    >
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-bold">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-wider flex items-center gap-2">
                  ScanVMS
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}
                  >
                    Packaging Proof
                  </span>
                </h1>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Barcode Auto-Recording & Timestamp VMS
              </p>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-yellow-400' : 'bg-zinc-100 border-zinc-300 text-zinc-700'
              }`}
              title="Toggle Dark / Light Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenTimestampModal}
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-zinc-100 border-zinc-300 text-emerald-600'
              }`}
              title="Edit Timestamp"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto text-xs">
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-medium transition ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
            }`}
            title="Switch Dashboard Theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-zinc-700" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Timestamp Editor Button */}
          <button
            type="button"
            onClick={onOpenTimestampModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Edit Timestamp</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
              }`}
            >
              {timestampConfig.mode === 'realtime' ? 'Live' : 'Custom'}
            </span>
          </button>

          {/* Auto Download Toggle */}
          <button
            type="button"
            onClick={() => onUpdateAppSettings({ autoDownloadOnStop: !appSettings.autoDownloadOnStop })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              appSettings.autoDownloadOnStop
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                : 'bg-zinc-100 border-zinc-300 text-zinc-500'
            }`}
            title="Auto download when Stop is pressed"
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
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
            }`}
            title="Scanner sound feedback"
          >
            {appSettings.scannerBeep ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="hidden sm:inline">Beep</span>
          </button>

          {/* Saved count badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saved:</span>
            <span className="font-bold font-mono">{totalSavedVideos}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
