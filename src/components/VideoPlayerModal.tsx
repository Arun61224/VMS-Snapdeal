import React, { useState, useRef, useEffect } from 'react';
import { RecordedVideo } from '../types';
import { X, Download, Trash2, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Tag, Calendar, Clock, HardDrive } from 'lucide-react';

interface VideoPlayerModalProps {
  video: RecordedVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDownload: (video: RecordedVideo) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
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
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Tag className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white tracking-wider">
                  {video.barcode}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {video.stationName || 'Station 01'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Packaging Proof Recorded on {new Date(video.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Display */}
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
            <div className="text-zinc-500 text-sm">Loading video stream...</div>
          )}

          {/* Big Center Play Overlay */}
          {!isPlaying && videoUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}
        </div>

        {/* Player Controls Bar */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
          {/* Progress Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 min-w-10 text-right">
              {formatSecs(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || video.duration || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-zinc-400 min-w-10">
              {formatSecs(duration || video.duration)}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
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
                className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Speed Switcher */}
              <div className="flex items-center rounded-lg bg-zinc-800 p-0.5 text-xs text-zinc-300">
                {[0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changeRate(rate)}
                    className={`px-2 py-1 rounded transition ${
                      playbackRate === rate ? 'bg-emerald-500 font-bold text-black' : 'hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Download & Delete */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete recording for barcode ${video.barcode}?`)) {
                    onDelete(video.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
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
        <div className="px-5 py-3 bg-zinc-900 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-zinc-500" />
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">File Name</span>
              <span className="font-mono text-zinc-200 truncate block max-w-[140px]">{video.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">Duration</span>
              <span className="text-zinc-200">{formatSecs(video.duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">File Size</span>
              <span className="text-zinc-200">{formattedSize(video.fileSize)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">Logged At</span>
              <span className="text-zinc-200">{new Date(video.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
