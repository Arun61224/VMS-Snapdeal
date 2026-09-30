import React, { useState, useRef, useEffect } from 'react';
import { RecordedVideo } from '../types';
import { X, Download, Trash2, Play, Pause, RotateCcw, Volume2, VolumeX, Tag, Calendar, Clock, HardDrive } from 'lucide-react';

interface VideoPlayerModalProps {
  theme: 'dark' | 'light';
  video: RecordedVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDownload: (video: RecordedVideo) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  theme,
  video,
  isOpen,
  onClose,
  onDelete,
  onDownload,
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (video && video.blob) {
      const url = URL.createObjectURL(video.blob);
      setVideoUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoUrl(null);
    }
  }, [video]);

  if (!isOpen || !video) return null;

  const isDark = theme === 'dark';

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const formatSecs = (sec: number) => {
    if (isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formattedSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className={`border rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Tag className="w-4 h-4" />
            </span>
            <div>
              <span className="font-mono text-base font-bold tracking-wider">
                {video.barcode}
              </span>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Recorded on {new Date(video.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Feed */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[55vh] overflow-hidden group">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-h-[55vh] w-auto mx-auto object-contain cursor-pointer"
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current && videoRef.current.duration) {
                  setDuration(videoRef.current.duration);
                }
              }}
              muted={isMuted}
              playsInline
            />
          ) : (
            <div className="text-zinc-500 text-sm">Loading video...</div>
          )}

          {!isPlaying && videoUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}
        </div>

        {/* Controls Bar */}
        <div className={`p-4 border-t space-y-3 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono min-w-10 text-right ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {formatSecs(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || video.duration || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer"
            />
            <span className={`text-xs font-mono min-w-10 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {formatSecs(duration || video.duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`p-2 rounded-lg transition ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                }}
                className={`p-2 rounded-lg transition ${
                  isDark ? 'bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg transition ${
                  isDark ? 'bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <div className={`flex items-center rounded-lg p-0.5 text-xs ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
                {[0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changeRate(rate)}
                    className={`px-2 py-1 rounded transition ${
                      playbackRate === rate ? 'bg-emerald-500 font-bold text-black' : 'hover:text-zinc-900'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm(`Delete recording for barcode ${video.barcode}?`)) {
                    onDelete(video.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <button
                onClick={() => onDownload(video)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shadow-md shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                Download ({video.barcode}.webm)
              </button>
            </div>
          </div>
        </div>

        {/* Metadata Footer */}
        <div
          className={`px-5 py-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs ${
            isDark ? 'bg-zinc-900 border-zinc-800/80 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 opacity-60" />
            <div>
              <span className="block text-[10px] uppercase opacity-60">File</span>
              <span className="font-mono font-semibold truncate block max-w-[140px]">{video.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <div>
              <span className="block text-[10px] uppercase opacity-60">Duration</span>
              <span className="font-semibold">{formatSecs(video.duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 opacity-60" />
            <div>
              <span className="block text-[10px] uppercase opacity-60">File Size</span>
              <span className="font-semibold">{formattedSize(video.fileSize)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            <div>
              <span className="block text-[10px] uppercase opacity-60">Logged At</span>
              <span className="font-semibold">{new Date(video.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
