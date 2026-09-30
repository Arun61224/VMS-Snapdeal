import React, { useState, useEffect } from 'react';
import { TimestampConfig, AppSettings, RecordedVideo } from './types';
import { Header } from './components/Header';
import { LiveRecorder } from './components/LiveRecorder';
import { VideoArchive } from './components/VideoArchive';
import { TimestampEditorModal } from './components/TimestampEditorModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { getAllVideos, saveVideo, deleteVideo, clearAllVideos } from './utils/db';
import { ShieldCheck, HelpCircle } from 'lucide-react';

const DEFAULT_TIMESTAMP_CONFIG: TimestampConfig = {
  mode: 'realtime',
  customDateTime: new Date().toISOString().slice(0, 19),
  offsetMinutes: 0,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  showSeconds: true,
  showMilliseconds: true,
  position: 'top-left',
  fontSize: 20,
  textColor: '#00ff66',
  bgColor: 'rgba(0,0,0,0.65)',
  showRecBlinker: true,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  autoDownloadOnStop: true,
  scannerBeep: true,
  selectedCameraId: '',
  audioEnabled: true,
};

export default function App() {
  const [timestampConfig, setTimestampConfig] = useState<TimestampConfig>(() => {
    try {
      const saved = localStorage.getItem('scanvms_timestamp_config');
      return saved ? JSON.parse(saved) : DEFAULT_TIMESTAMP_CONFIG;
    } catch {
      return DEFAULT_TIMESTAMP_CONFIG;
    }
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('scanvms_app_settings');
      return saved ? JSON.parse(saved) : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<RecordedVideo | null>(null);
  const [isTimestampModalOpen, setIsTimestampModalOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const theme = appSettings.theme || 'dark';
  const isDark = theme === 'dark';

  useEffect(() => {
    try {
      localStorage.setItem('scanvms_timestamp_config', JSON.stringify(timestampConfig));
    } catch (e) {
      console.warn('Failed to save config', e);
    }
  }, [timestampConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('scanvms_app_settings', JSON.stringify(appSettings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }, [appSettings]);

  // Load videos on mount
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await getAllVideos();
        setVideos(stored);
      } catch (err) {
        console.error('Error loading videos:', err);
      }
    }
    loadData();
  }, []);

  const handleVideoRecorded = async (newVideo: RecordedVideo) => {
    try {
      await saveVideo(newVideo);
      setVideos((prev) => [newVideo, ...prev]);
    } catch (e) {
      console.error('Failed to save recorded video:', e);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      if (selectedVideo?.id === id) {
        setSelectedVideo(null);
      }
    } catch (e) {
      console.error('Failed to delete video:', e);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllVideos();
      setVideos([]);
      setSelectedVideo(null);
    } catch (e) {
      console.error('Failed to clear videos:', e);
    }
  };

  const handleDownloadVideo = (video: RecordedVideo) => {
    if (!video.blob) return;
    const url = URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = video.title || `${video.barcode}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleUpdateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-black ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
      }`}
    >
      {/* Header with Dark / Light Switcher */}
      <Header
        timestampConfig={timestampConfig}
        appSettings={appSettings}
        onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
        onUpdateAppSettings={handleUpdateAppSettings}
        totalSavedVideos={videos.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Info Banner */}
        <div
          className={`border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
            isDark
              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
              : 'bg-white border-zinc-200 text-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  Barcode Auto-Recording VMS
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-600'
                  }`}
                >
                  Scanner Gun Active
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Barcode scan karte hi recording start ho jayegi &rarr; <strong>STOP</strong> dabane se barcode number ke naam se video save ho jayegi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-xl transition ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{showHowItWorks ? 'Hide Guide' : 'Guide'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Guide */}
        {showHowItWorks && (
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-2xl p-4 animate-in fade-in ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}
          >
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center mb-1">1</span>
              <h4 className="text-xs font-bold">1. Barcode Scan</h4>
              <p className="text-[11px] opacity-70 mt-1">
                USB/Bluetooth scanner gun se barcode scan karein ya manually enter karein. Recording turant start ho jayegi.
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center mb-1">2</span>
              <h4 className="text-xs font-bold">2. Burnt-in Date & Time</h4>
              <p className="text-[11px] opacity-70 mt-1">
                Video frames par clear timestamp aur date stamp burn ho jata hai jisse proof verifiable rehta hai.
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center mb-1">3</span>
              <h4 className="text-xs font-bold">3. STOP & Barcode File Save</h4>
              <p className="text-[11px] opacity-70 mt-1">
                Lal STOP button (ya Spacebar) dabayein. Video barcode number ke naam se save aur auto-download ho jayegi.
              </p>
            </div>
          </div>
        )}

        {/* Live Camera Recorder */}
        <section aria-label="Live Camera and Recorder">
          <LiveRecorder
            theme={theme}
            timestampConfig={timestampConfig}
            appSettings={appSettings}
            onVideoRecorded={handleVideoRecorded}
            onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
          />
        </section>

        {/* Saved Videos Archive */}
        <section aria-label="Saved Recordings Archive" className="pt-2">
          <VideoArchive
            theme={theme}
            videos={videos}
            onSelectVideo={(v) => setSelectedVideo(v)}
            onDeleteVideo={handleDeleteVideo}
            onClearAll={handleClearAll}
            onDownloadVideo={handleDownloadVideo}
          />
        </section>
      </main>

      {/* Timestamp Editor Modal */}
      <TimestampEditorModal
        theme={theme}
        isOpen={isTimestampModalOpen}
        onClose={() => setIsTimestampModalOpen(false)}
        config={timestampConfig}
        onSave={(newCfg) => setTimestampConfig(newCfg)}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        theme={theme}
        video={selectedVideo}
        isOpen={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
        onDelete={handleDeleteVideo}
        onDownload={handleDownloadVideo}
      />
    </div>
  );
}
