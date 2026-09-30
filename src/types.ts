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
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number; // e.g. 18, 22, 28
  textColor: string; // '#00ff66', '#ffffff', '#ffff00', '#00e5ff'
  bgColor: string; // 'rgba(0,0,0,0.65)', 'transparent', '#000000'
  showRecBlinker: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  autoDownloadOnStop: boolean;
  scannerBeep: boolean;
  selectedCameraId: string;
  audioEnabled: boolean;
}
