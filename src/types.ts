export interface RecordedVideo {
  id: string;
  barcode: string;
  title: string;
  blob: Blob;
  thumbnailUrl?: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: string; // ISO string
  timestampConfigSnapshot?: TimestampConfig;
  stationName?: string;
  notes?: string;
}

export interface TimestampConfig {
  mode: 'realtime' | 'custom_fixed' | 'custom_offset';
  customDateTime: string; // e.g. '2026-09-30T14:30:00'
  offsetMinutes: number;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD-MMM-YYYY';
  timeFormat: '24h' | '12h';
  showSeconds: boolean;
  showMilliseconds: boolean;
  stationText: string;
  operatorName: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number; // e.g. 18, 24, 32
  textColor: string; // '#ffffff', '#00ff66', '#ffff00', '#00e5ff'
  bgColor: string; // 'rgba(0,0,0,0.65)', 'transparent', '#000000'
  showBarcodeWatermark: boolean;
  showRecBlinker: boolean;
}

export interface AppSettings {
  autoDownloadOnStop: boolean;
  scannerBeep: boolean;
  selectedCameraId: string;
  audioEnabled: boolean;
  videoQuality: '720p' | '1080p';
  filenameTemplate: 'barcode_only' | 'barcode_timestamp' | 'station_barcode_date';
}
