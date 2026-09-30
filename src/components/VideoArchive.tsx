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
  Filter,
  ExternalLink,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface VideoArchiveProps {
  videos: RecordedVideo[];
  onSelectVideo: (video: RecordedVideo) => void;
  onDeleteVideo: (id: string) => void;
  onClearAll: () => void;
  onDownloadVideo: (video: RecordedVideo) => void;
}

export const VideoArchive: React.FC<VideoArchiveProps> = ({
  videos,
  onSelectVideo,
  onDeleteVideo,
  onClearAll,
  onDownloadVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const copyToClipboard = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Search matching
      const matchesSearch =
        video.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.stationName && video.stationName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Date filtering
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
    const headers = ['Barcode', 'Filename', 'Duration_Seconds', 'FileSize_Bytes', 'CreatedAt_ISO', 'Station'];
    const rows = videos.map((v) => [
      `"${v.barcode}"`,
      `"${v.title}"`,
      v.duration,
      v.fileSize,
      `"${v.createdAt}"`,
      `"${v.stationName || ''}"`,
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
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-400" />
              Saved Packaging Recordings
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 font-mono text-zinc-300">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Archived videos automatically named by scanned Barcode number
          </p>
        </div>

        {/* Action and Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search barcode or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="yesterday">Yesterday</option>
          </select>

          {/* Export CSV Log */}
          {videos.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 text-xs font-medium transition"
              title="Export packing audit log as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Clear Archive */}
          {videos.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all recorded videos from browser memory?')) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
              title="Delete all saved recordings"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Videos List / Grid */}
      {filteredVideos.length === 0 ? (
        <div className="py-14 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 text-zinc-500 flex items-center justify-center mb-3">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">No packaging recordings found</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            {searchQuery
              ? `No matches for "${searchQuery}". Clear your search query.`
              : 'Scan any parcel barcode with your barcode scanner or enter a number above to start auto-recording.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700/90 rounded-2xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl flex flex-col"
            >
              {/* Thumbnail Container */}
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
                  <Film className="w-8 h-8 text-zinc-700" />
                )}

                {/* Duration Badge */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-zinc-200 backdrop-blur-sm">
                  {formatSecs(video.duration)}
                </span>

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Top Corner Time Badge */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                  {new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Card Details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  {/* Barcode Header with Copy Button */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-white tracking-wide truncate">
                      {video.barcode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(video.barcode)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                      title="Copy Barcode"
                    >
                      {copiedBarcode === video.barcode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <HardDrive className="w-3 h-3 text-zinc-500" />
                      {video.fileSize > 1024 * 1024
                        ? `${(video.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(video.fileSize / 1024)} KB`}
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => onSelectVideo(video)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Play Preview
                  </button>

                  <button
                    onClick={() => onDownloadVideo(video)}
                    className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                    title={`Download as ${video.title || video.barcode + '.webm'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete video for barcode ${video.barcode}?`)) {
                        onDeleteVideo(video.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
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

      {/* Footer Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span>
            Total Archived: <strong className="text-white font-mono">{videos.length}</strong>
          </span>
          <span>
            Storage Used: <strong className="text-white font-mono">{totalSizeFormatted}</strong>
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">
          All videos saved securely in browser IndexedDB cache
        </span>
      </div>
    </div>
  );
};
