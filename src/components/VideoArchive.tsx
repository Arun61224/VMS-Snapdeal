import React, { useState, useMemo } from 'react';
import { RecordedVideo } from '../types';
import {
  Search,
  Download,
  Trash2,
  Play,
  Film,
  Calendar,
  HardDrive,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

interface VideoArchiveProps {
  theme: 'dark' | 'light';
  videos: RecordedVideo[];
  onSelectVideo: (video: RecordedVideo) => void;
  onDeleteVideo: (id: string) => void;
  onClearAll: () => void;
  onDownloadVideo: (video: RecordedVideo) => void;
}

export const VideoArchive: React.FC<VideoArchiveProps> = ({
  theme,
  videos,
  onSelectVideo,
  onDeleteVideo,
  onClearAll,
  onDownloadVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const copyToClipboard = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch =
        video.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        return video.createdAt.slice(0, 10) === todayStr;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        return video.createdAt.slice(0, 10) === yesterdayStr;
      }

      return true;
    });
  }, [videos, searchQuery, dateFilter]);

  const totalSizeFormatted = useMemo(() => {
    const totalBytes = videos.reduce((acc, curr) => acc + (curr.fileSize || curr.blob?.size || 0), 0);
    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [videos]);

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const exportCSV = () => {
    if (videos.length === 0) return;
    const headers = ['Barcode', 'Filename', 'Duration_Seconds', 'FileSize_Bytes', 'CreatedAt_ISO'];
    const rows = videos.map((v) => [
      `"${v.barcode}"`,
      `"${v.title}"`,
      v.duration,
      v.fileSize,
      `"${v.createdAt}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VMS_Packaging_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 transition-colors ${
        isDark ? 'bg-zinc-900/90 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
      }`}
    >
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-wide flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-500" />
              Saved Packaging Recordings
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-300 text-zinc-700'
              }`}
            >
              {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Videos automatically saved and named by scanned barcode
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500'
                  : 'bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className={`border rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-300 text-zinc-800'
            }`}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>

          {/* Export CSV */}
          {videos.length > 0 && (
            <button
              onClick={exportCSV}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                isDark ? 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
              }`}
              title="Export packing log as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Clear Archive */}
          {videos.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all recordings from browser storage?')) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition"
              title="Clear all saved videos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div
          className={`py-14 text-center border border-dashed rounded-2xl flex flex-col items-center justify-center p-6 ${
            isDark ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400' : 'border-zinc-300 bg-zinc-50 text-zinc-500'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isDark ? 'bg-zinc-800/60 text-zinc-500' : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No packaging recordings yet</h3>
          <p className="text-xs max-w-sm">
            {searchQuery
              ? `No results for "${searchQuery}".`
              : 'Scan parcel barcode to start automatic recording.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className={`group border rounded-2xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl flex flex-col ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {/* Thumbnail */}
              <div
                onClick={() => onSelectVideo(video)}
                className="relative aspect-video bg-zinc-900 cursor-pointer overflow-hidden flex items-center justify-center"
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.barcode}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Film className="w-8 h-8 text-zinc-600" />
                )}

                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-white backdrop-blur-sm">
                  {formatSecs(video.duration)}
                </span>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                  {new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-sm tracking-wide truncate">
                      {video.barcode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(video.barcode)}
                      className={`p-1 rounded transition ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                      }`}
                      title="Copy Barcode"
                    >
                      {copiedBarcode === video.barcode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className={`flex items-center gap-3 text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 opacity-60" />
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <HardDrive className="w-3 h-3 opacity-60" />
                      {video.fileSize > 1024 * 1024
                        ? `${(video.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(video.fileSize / 1024)} KB`}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between gap-2 pt-2 border-t ${
                    isDark ? 'border-zinc-900' : 'border-zinc-100'
                  }`}
                >
                  <button
                    onClick={() => onSelectVideo(video)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isDark ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Play Preview
                  </button>

                  <button
                    onClick={() => onDownloadVideo(video)}
                    className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition"
                    title={`Download ${video.title || video.barcode + '.webm'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete recording for barcode ${video.barcode}?`)) {
                        onDeleteVideo(video.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition"
                    title="Delete recording"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs ${
          isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
        }`}
      >
        <div className="flex items-center gap-4">
          <span>
            Total Recorded: <strong className="font-mono">{videos.length}</strong>
          </span>
          <span>
            Storage: <strong className="font-mono">{totalSizeFormatted}</strong>
          </span>
        </div>
        <span className="text-[11px] opacity-70">
          Saved locally in browser storage
        </span>
      </div>
    </div>
  );
};
