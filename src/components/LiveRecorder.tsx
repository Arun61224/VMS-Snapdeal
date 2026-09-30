import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimestampConfig, AppSettings, RecordedVideo } from '../types';
import { computeCurrentDateTime, drawTimestampOnCanvas } from '../utils/timestampRenderer';
import { CameraBarcodeScanner, setupHardwareBarcodeScanner } from '../utils/barcodeScanner';
import { playBarcodeBeep, playRecordStartSound, playRecordStopSound } from '../utils/audio';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import {
  Camera,
  Square,
  Disc,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  Maximize2,
  CheckCircle,
  Sparkles,
  Barcode,
  Layers,
  Zap,
} from 'lucide-react';

interface LiveRecorderProps {
  timestampConfig: TimestampConfig;
  appSettings: AppSettings;
  onVideoRecorded: (video: RecordedVideo) => void;
  onOpenTimestampModal: () => void;
}

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  timestampConfig,
  appSettings,
  onVideoRecorded,
  onOpenTimestampModal,
}) => {
  // Video and Canvas references
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // States
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [lastSavedBarcode, setLastSavedBarcode] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'alert' } | null>(null);

  // Camera Barcode Scanner
  const [cameraScannerActive, setCameraScannerActive] = useState<boolean>(false);
  const cameraScannerInstanceRef = useRef<CameraBarcodeScanner | null>(null);

  // Timestamp references
  const streamStartTimeRef = useRef<number>(performance.now());
  const customStartMsRef = useRef<number | undefined>(undefined);

  // Initialize custom start time if in custom mode
  useEffect(() => {
    streamStartTimeRef.current = performance.now();
    if (timestampConfig.mode === 'custom_fixed' && timestampConfig.customDateTime) {
      customStartMsRef.current = new Date(timestampConfig.customDateTime).getTime();
    } else {
      customStartMsRef.current = undefined;
    }
  }, [timestampConfig]);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }, [selectedDeviceId]);

  // Start Camera Feed
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    setCameraReady(false);

    try {
      if (videoElementRef.current && videoElementRef.current.srcObject) {
        const oldStream = videoElementRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' },
        audio: audioEnabled,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        await videoElementRef.current.play();
        setCameraReady(true);
      }

      await updateDeviceList();
    } catch (err: any) {
      console.error('Camera access error:', err);
      // Try fallback without audio or with basic constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = fallbackStream;
          await videoElementRef.current.play();
          setCameraReady(true);
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr.message ||
            'Unable to access camera. Please allow webcam permissions in your browser.'
        );
      }
    }
  }, [audioEnabled, updateDeviceList]);

  // Initial camera mount
  useEffect(() => {
    startCamera(selectedDeviceId);

    return () => {
      if (videoElementRef.current && videoElementRef.current.srcObject) {
        const stream = videoElementRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // When selected device changes
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  // Continuous Canvas Rendering Loop (Drawing camera feed + burnt-in timestamp)
  useEffect(() => {
    const render = () => {
      const video = videoElementRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Sync canvas dimensions with video feed resolution
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
          }

          // Draw the video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Compute current timestamp
          const currentDate = computeCurrentDateTime(
            timestampConfig,
            streamStartTimeRef.current,
            customStartMsRef.current
          );

          // Burn in the timestamp, station, and barcode watermark onto the canvas
          drawTimestampOnCanvas(
            ctx,
            canvas.width,
            canvas.height,
            timestampConfig,
            currentDate,
            activeBarcode,
            isRecording,
            recordingSeconds
          );
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timestampConfig, activeBarcode, isRecording, recordingSeconds]);

  // Start Recording
  const startRecording = useCallback((barcode: string) => {
    if (isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Camera canvas not initialized yet.');
      return;
    }

    if (appSettings.scannerBeep) {
      playBarcodeBeep();
      setTimeout(() => playRecordStartSound(), 100);
    }

    setActiveBarcode(barcode);
    setIsRecording(true);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];

    // Capture stream from canvas with 30fps
    const canvasStream = canvas.captureStream(30);

    // Merge audio from camera if available
    if (videoElementRef.current && videoElementRef.current.srcObject) {
      const cameraStream = videoElementRef.current.srcObject as MediaStream;
      const audioTracks = cameraStream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0].clone());
      }
    }

    // Determine supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264',
      'video/webm',
      'video/mp4',
    ];
    let selectedMimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        selectedMimeType = mt;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(canvasStream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        finalizeRecording(barcode);
      };

      recorder.start(500); // chunk every 500ms for safety

      // Start elapsed timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      setStatusNotification({
        message: `Recording Started for Barcode: ${barcode}`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
      alert('Could not start video recorder: ' + e.message);
      setIsRecording(false);
      setActiveBarcode(null);
    }
  }, [isRecording, appSettings.scannerBeep]);

  // Stop Recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    if (appSettings.scannerBeep) {
      playRecordStopSound();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  }, [isRecording, appSettings.scannerBeep]);

  // Finalize video blob, save to DB and trigger auto-download
  const finalizeRecording = (barcode: string) => {
    const chunks = recordedChunksRef.current;
    if (chunks.length === 0) return;

    const mime = mediaRecorderRef.current?.mimeType || 'video/webm';
    const videoBlob = new Blob(chunks, { type: mime });

    // Generate thumbnail from canvas
    let thumbnailUrl = '';
    if (canvasRef.current) {
      try {
        thumbnailUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      } catch (err) {
        console.warn('Thumbnail generation failed', err);
      }
    }

    // Determine filename with barcode number
    const dateFormatted = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let filename = `${barcode}.webm`;
    if (appSettings.filenameTemplate === 'barcode_timestamp') {
      filename = `${barcode}_${dateFormatted}.webm`;
    } else if (appSettings.filenameTemplate === 'station_barcode_date') {
      filename = `${timestampConfig.stationText || 'STATION'}_${barcode}_${dateFormatted}.webm`;
    }

    const newVideo: RecordedVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      barcode,
      title: filename,
      blob: videoBlob,
      thumbnailUrl,
      duration: recordingSeconds,
      fileSize: videoBlob.size,
      createdAt: new Date().toISOString(),
      timestampConfigSnapshot: { ...timestampConfig },
      stationName: timestampConfig.stationText,
    };

    onVideoRecorded(newVideo);
    setLastSavedBarcode(barcode);
    setActiveBarcode(null);

    // Auto-download to PC if enabled
    if (appSettings.autoDownloadOnStop) {
      triggerDownload(videoBlob, filename);
    }

    setStatusNotification({
      message: `Video saved successfully: ${filename}`,
      type: 'success',
    });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Hardware Scanner Gun listener (Global keystroke detection)
  useEffect(() => {
    const cleanup = setupHardwareBarcodeScanner({
      onScan: (scannedCode) => {
        console.log('Hardware Barcode Gun Scanned:', scannedCode);
        if (!isRecording) {
          startRecording(scannedCode);
        } else {
          // If already recording and another barcode is scanned, stop current and start new
          stopRecording();
          setTimeout(() => {
            startRecording(scannedCode);
          }, 400);
        }
      },
    });

    return cleanup;
  }, [isRecording, startRecording, stopRecording]);

  // Built-in Camera Barcode Scanner
  useEffect(() => {
    if (!cameraScannerActive || !videoElementRef.current) {
      if (cameraScannerInstanceRef.current) {
        cameraScannerInstanceRef.current.stopScan();
      }
      return;
    }

    if (!cameraScannerInstanceRef.current) {
      cameraScannerInstanceRef.current = new CameraBarcodeScanner();
    }

    cameraScannerInstanceRef.current.startScan(
      videoElementRef.current,
      (scannedCode) => {
        if (!isRecording && scannedCode) {
          console.log('Camera Barcode Detected:', scannedCode);
          startRecording(scannedCode);
        }
      }
    );

    return () => {
      if (cameraScannerInstanceRef.current) {
        cameraScannerInstanceRef.current.stopScan();
      }
    };
  }, [cameraScannerActive, isRecording, startRecording]);

  // Spacebar or Esc shortcut to Stop recording quickly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRecording && (e.code === 'Space' || e.code === 'Escape')) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, stopRecording]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {statusNotification && (
        <div className="fixed top-16 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/50 shadow-2xl text-white text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{statusNotification.message}</span>
          </div>
        </div>
      )}

      {/* Main Live Camera & Recording Viewport */}
      <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Hidden Raw Video Stream Source */}
        <video
          ref={videoElementRef}
          className="hidden"
          playsInline
          muted
          autoPlay
        />

        {/* Live Canvas with burnt-in Timestamp and Overlays */}
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Camera Access Required</h3>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-lg hover:bg-emerald-400 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Camera Access
              </button>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
            />
          )}

          {/* Camera Scanner Reticle Overlay */}
          {cameraScannerActive && !isRecording && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-dashed border-amber-400/80 rounded-2xl bg-amber-500/5 flex flex-col items-center justify-between p-2 shadow-2xl backdrop-blur-[1px]">
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                  Align Barcode Here
                </span>
                <div className="w-full h-0.5 bg-amber-400 shadow-lg animate-pulse" />
                <span className="text-[10px] text-amber-300/80">Scanning live feed...</span>
              </div>
            </div>
          )}

          {/* Top Overlays on Canvas: Recording Badge & Quick Device Picker */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/90 text-white shadow-lg animate-pulse border border-rose-400/30 text-xs font-bold font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>RECORDING: {activeBarcode}</span>
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-[11px]">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                    {String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 text-zinc-300 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>VMS Live Monitoring</span>
                </div>
              )}
            </div>

            {/* Camera & Audio Selectors */}
            <div className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md p-1 rounded-xl border border-zinc-800 text-xs">
              {cameraDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  disabled={isRecording}
                  className="bg-transparent text-zinc-200 border-none px-2 py-1 focus:outline-none text-xs font-medium cursor-pointer"
                >
                  {cameraDevices.map((dev, idx) => (
                    <option key={dev.deviceId} value={dev.deviceId} className="bg-zinc-900 text-white">
                      {dev.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                disabled={isRecording}
                className={`p-1.5 rounded-lg transition ${
                  audioEnabled ? 'text-zinc-200 hover:text-white' : 'text-zinc-500'
                }`}
                title={audioEnabled ? 'Audio Recording ON' : 'Audio Recording Muted'}
              >
                {audioEnabled ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Bottom Prominent Recording Bar on Viewport */}
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
              <span className="text-zinc-500 font-mono">Timestamp:</span>
              <span className="text-emerald-400 font-mono">
                {timestampConfig.mode === 'realtime' ? 'System RTC' : 'Custom'}
              </span>
              <button
                onClick={onOpenTimestampModal}
                className="underline hover:text-zinc-200 ml-1 text-zinc-400"
              >
                edit
              </button>
            </div>

            {/* BIG PROMINENT STOP RECORDING BUTTON */}
            {isRecording && (
              <div className="mx-auto sm:mr-0">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-2xl shadow-rose-600/40 border-2 border-rose-400 transition hover:scale-105 active:scale-95 animate-pulse"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>STOP & SAVE ({activeBarcode})</span>
                  <span className="text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded">
                    [Space / Esc]
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Input & Scanner Controls */}
      <ManualBarcodeInput
        onScanAndStart={startRecording}
        isRecording={isRecording}
        cameraScannerActive={cameraScannerActive}
        onToggleCameraScanner={() => setCameraScannerActive(!cameraScannerActive)}
      />
    </div>
  );
};
