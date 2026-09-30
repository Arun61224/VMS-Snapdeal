import React, { useState, useEffect } from 'react';
import { TimestampConfig, AppSettings, RecordedVideo } from './types';
import { Header } from './components/Header';
import { LiveRecorder } from './components/LiveRecorder';
import { VideoArchive } from './components/VideoArchive';
import { TimestampEditorModal } from './components/TimestampEditorModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { getAllVideos, saveVideo, deleteVideo, clearAllVideos } from './utils/db';

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

  // Load saved recordings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await getAllVideos();
        setVideos(stored);
      } catch (err) {
        console.error('Error loading recordings:', err);
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
      console.error('Failed to clear recordings:', e);
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
      {/* Top Header */}
      <Header
        timestampConfig={timestampConfig}
        appSettings={appSettings}
        onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
        onUpdateAppSettings={handleUpdateAppSettings}
        totalSavedVideos={videos.length}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 py-3 sm:px-6 sm:py-4 space-y-4">
        {/* Live Camera Recorder & Barcode Scanner */}
        <section aria-label="Live Camera and Recorder">
          <LiveRecorder
            theme={theme}
            timestampConfig={timestampConfig}
            appSettings={appSettings}
            onVideoRecorded={handleVideoRecorded}
            onOpenTimestampModal={() => setIsTimestampModalOpen(true)}
          />
        </section>

        {/* Saved Recordings Archive */}
        <section aria-label="Saved Recordings Archive">
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

      {/* Timestamp Configuration Modal */}
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
