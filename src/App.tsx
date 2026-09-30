import React, { useState, useEffect, useCallback } from 'react';
import { TimestampConfig, AppSettings, RecordedVideo } from './types';
import { Header } from './components/Header';
import { LiveRecorder } from './components/LiveRecorder';
import { VideoArchive } from './components/VideoArchive';
import { TimestampEditorModal } from './components/TimestampEditorModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { getAllVideos, saveVideo, deleteVideo, clearAllVideos } from './utils/db';
import { seedInitialSampleIfEmpty } from './utils/sampleData';
import { ShieldCheck, Barcode, Video, Clock, HelpCircle, Download, CheckCircle2 } from 'lucide-react';

const DEFAULT_TIMESTAMP_CONFIG: TimestampConfig = {
  mode: 'realtime',
  customDateTime: new Date().toISOString().slice(0, 19),
  offsetMinutes: 0,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  showSeconds: true,
  showMilliseconds: true,
  stationText: 'PACKING STATION-01',
  operatorName: 'Amit',
  position: 'top-left',
  fontSize: 20,
  textColor: '#00ff66',
  bgColor: 'rgba(0,0,0,0.65)',
  showBarcodeWatermark: true,
  showRecBlinker: true,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  autoDownloadOnStop: true, // Download with barcode name immediately upon stopping
  scannerBeep: true,
  selectedCameraId: '',
  audioEnabled: true,
  videoQuality: '1080p',
  filenameTemplate: 'barcode_only', // user requested barcode number filename e.g. SDLC1078691604.webm
};

export default function App() {
  // Config states
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

  // Data states
  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<RecordedVideo | null>(null);
  const [isTimestampModalOpen, setIsTimestampModalOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Save config to localStorage
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

  // Load videos from DB on mount
  useEffect(() => {
    async function loadData() {
      try {
        const initial = await seedInitialSampleIfEmpty();
        setVideos(initial);
      } catch (err) {
        console.error('Error loading videos:', err);
      }
    }
    loadData();
  }, []);

  // Handlers
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Bar */}
      <Header
        timestampConfig={timestampConfig}
        appSettings={appSettings}
        onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
        onUpdateAppSettings={handleUpdateAppSettings}
        totalSavedVideos={videos.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Quick Instructions & Workflow Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Automated Packaging VMS Workflow
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  Ready for Scanner Gun
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Scan any parcel barcode (Gun or Camera) to <strong>Auto-Record</strong> with burnt-in timestamp proof &rarr; Click <strong>STOP</strong> to save with barcode file name.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showHowItWorks ? 'Hide Guide' : 'How it works'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible How It Works Guide */}
        {showHowItWorks && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 animate-in fade-in">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1">1</span>
              <h4 className="text-xs font-bold text-white">Barcode Scan</h4>
              <p className="text-[11px] text-zinc-400">
                Point any USB/Bluetooth barcode scanner gun or camera at the parcel label. Recording triggers instantly.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1">2</span>
              <h4 className="text-xs font-bold text-white">Burnt-in Timestamp</h4>
              <p className="text-[11px] text-zinc-400">
                Live date, time, station tag & barcode are physically watermarked onto the video frames for undisputed dispute proof.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1">3</span>
              <h4 className="text-xs font-bold text-white">Stop Button</h4>
              <p className="text-[11px] text-zinc-400">
                Hit the red STOP button (or Spacebar). The video stops and names itself exactly as the scanned Barcode number.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1">4</span>
              <h4 className="text-xs font-bold text-white">Edit & Archive</h4>
              <p className="text-[11px] text-zinc-400">
                Change timestamp date, time, colors, or station in &apos;Edit Timestamp&apos;. Review, search, and download past videos below.
              </p>
            </div>
          </div>
        )}

        {/* Live Camera Recorder & Barcode Gun Trigger */}
        <section aria-label="Live Recording Section">
          <LiveRecorder
            timestampConfig={timestampConfig}
            appSettings={appSettings}
            onVideoRecorded={handleVideoRecorded}
            onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
          />
        </section>

        {/* Video Archive & Searchable History List */}
        <section aria-label="Saved Videos Archive Section" className="pt-2">
          <VideoArchive
            videos={videos}
            onSelectVideo={(v) => setSelectedVideo(v)}
            onDeleteVideo={handleDeleteVideo}
            onClearAll={handleClearAll}
            onDownloadVideo={handleDownloadVideo}
          />
        </section>
      </main>

      {/* Timestamp Customization Modal */}
      <TimestampEditorModal
        isOpen={isTimestampModalOpen}
        onClose={() => setIsTimestampModalOpen(false)}
        config={timestampConfig}
        onSave={(newCfg) => setTimestampConfig(newCfg)}
      />

      {/* Video Playback & Review Modal */}
      <VideoPlayerModal
        video={selectedVideo}
        isOpen={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
        onDelete={handleDeleteVideo}
        onDownload={handleDownloadVideo}
      />
    </div>
  );
}
