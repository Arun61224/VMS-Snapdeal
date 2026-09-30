import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimestampConfig, AppSettings, RecordedVideo } from '../types';
import { computeCurrentDateTime, drawTimestampOnCanvas } from '../utils/timestampRenderer';
import { CameraBarcodeScanner, setupHardwareBarcodeScanner } from '../utils/barcodeScanner';
import { playBarcodeBeep, playRecordStartSound, playRecordStopSound } from '../utils/audio';
import {
  Square,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  CheckCircle,
  Scan,
  Play,
  Camera,
  CheckCircle2,
} from 'lucide-react';

interface LiveRecorderProps {
  theme: 'dark' | 'light';
  timestampConfig: TimestampConfig;
  appSettings: AppSettings;
  onVideoRecorded: (video: RecordedVideo) => void;
  onOpenTimestampModal: () => void;
}

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  theme,
  timestampConfig,
  appSettings,
  onVideoRecorded,
}) => {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const [cameraScannerActive, setCameraScannerActive] = useState<boolean>(false);
  const cameraScannerInstanceRef = useRef<CameraBarcodeScanner | null>(null);

  const streamStartTimeRef = useRef<number>(performance.now());
  const customStartMsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    streamStartTimeRef.current = performance.now();
    if (timestampConfig.mode === 'custom_fixed' && timestampConfig.customDateTime) {
      customStartMsRef.current = new Date(timestampConfig.customDateTime).getTime();
    } else {
      customStartMsRef.current = undefined;
    }
  }, [timestampConfig]);

  // Auto-focus input when ready
  useEffect(() => {
    if (!isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecording]);

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

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  // Continuous Canvas Rendering Loop with burnt-in Date & Time only
  useEffect(() => {
    const render = () => {
      const video = videoElementRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const currentDate = computeCurrentDateTime(
            timestampConfig,
            streamStartTimeRef.current,
            customStartMsRef.current
          );

          drawTimestampOnCanvas(
            ctx,
            canvas.width,
            canvas.height,
            timestampConfig,
            currentDate,
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
  }, [timestampConfig, isRecording, recordingSeconds]);

  // Start Recording
  const startRecording = useCallback((barcode: string) => {
    if (isRecording) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Camera canvas is not ready yet.');
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

    const canvasStream = canvas.captureStream(30);

    if (videoElementRef.current && videoElementRef.current.srcObject) {
      const cameraStream = videoElementRef.current.srcObject as MediaStream;
      const audioTracks = cameraStream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0].clone());
      }
    }

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264',
      'video/webm',
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

      recorder.start(500);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      setStatusNotification({
        message: `Recording Started: ${barcode}`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
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

  // Finalize video blob & trigger auto-download with barcode number
  const finalizeRecording = (barcode: string) => {
    const chunks = recordedChunksRef.current;
    if (chunks.length === 0) return;

    const mime = mediaRecorderRef.current?.mimeType || 'video/webm';
    const videoBlob = new Blob(chunks, { type: mime });

    let thumbnailUrl = '';
    if (canvasRef.current) {
      try {
        thumbnailUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      } catch (err) {
        console.warn('Thumbnail generation failed', err);
      }
    }

    const filename = `${barcode}.webm`;

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
    };

    onVideoRecorded(newVideo);
    setActiveBarcode(null);

    if (appSettings.autoDownloadOnStop) {
      triggerDownload(videoBlob, filename);
    }

    setStatusNotification({
      message: `Recording saved: ${filename}`,
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (code) {
      startRecording(code);
      setBarcodeInput('');
    }
  };

  // Hardware Scanner Gun keystroke detection
  useEffect(() => {
    const cleanup = setupHardwareBarcodeScanner({
      onScan: (scannedCode) => {
        if (!isRecording) {
          startRecording(scannedCode);
        } else {
          stopRecording();
          setTimeout(() => {
            startRecording(scannedCode);
          }, 350);
        }
      },
    });

    return cleanup;
  }, [isRecording, startRecording, stopRecording]);

  // Camera Barcode Scanner
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

  // Keyboard shortcut: Spacebar or Escape to Stop recording
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

  const isDark = theme === 'dark';

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {statusNotification && (
        <div className="fixed top-16 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold ${
              isDark ? 'bg-zinc-900 border-emerald-500/50 text-white' : 'bg-white border-emerald-500 text-zinc-900'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{statusNotification.message}</span>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE WORKSPACE LAYOUT (Matches 150% Zoom proportions at 100% default zoom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Live Camera Window (lg:col-span-8) */}
        <div
          className={`lg:col-span-8 relative rounded-2xl border shadow-xl overflow-hidden flex flex-col justify-center transition-colors ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-black border-zinc-300'
          }`}
        >
          <video ref={videoElementRef} className="hidden" playsInline muted autoPlay />

          <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] xl:h-[540px] flex items-center justify-center overflow-hidden bg-black">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-zinc-900/90 rounded-2xl m-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Camera Access Required</h3>
                <p className="text-sm text-zinc-400 mb-5 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm shadow-lg hover:bg-emerald-400 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Camera Access
                </button>
              </div>
            ) : (
              <canvas ref={canvasRef} className="max-h-full max-w-full object-contain mx-auto" />
            )}

            {/* Camera Scanner Reticle */}
            {cameraScannerActive && !isRecording && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-amber-400/90 rounded-2xl bg-amber-500/5 flex flex-col items-center justify-between p-2 shadow-2xl backdrop-blur-[1px]">
                  <span className="text-xs font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    Scan Barcode Here
                  </span>
                  <div className="w-full h-0.5 bg-amber-400 shadow-lg animate-pulse" />
                  <span className="text-xs text-amber-300/80">Reading camera feed...</span>
                </div>
              </div>
            )}

            {/* Top Overlays on Camera */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600/95 text-white shadow-lg animate-pulse border border-rose-400/30 text-xs sm:text-sm font-bold font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>REC: {activeBarcode}</span>
                    <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                      {String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-xs sm:text-sm font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Live Camera</span>
                  </div>
                )}
              </div>

              {/* Camera & Audio Selectors */}
              <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-xs sm:text-sm text-white">
                {cameraDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={handleDeviceChange}
                    disabled={isRecording}
                    className="bg-transparent text-white border-none px-2 py-0.5 focus:outline-none text-xs sm:text-sm font-medium cursor-pointer"
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
                  className="p-1.5 rounded-lg text-white hover:text-emerald-400 transition"
                  title={audioEnabled ? 'Audio Mic ON' : 'Audio Mic Muted'}
                >
                  {audioEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            </div>

            {/* Quick Stop overlay on video */}
            {isRecording && (
              <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-rose-600/50 border-2 border-rose-300 transition hover:scale-105 active:scale-95 animate-pulse"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>STOP & SAVE ({activeBarcode})</span>
                  <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded">
                    [Space]
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prominent Barcode Scanner Station Panel (lg:col-span-4) */}
        <div
          className={`lg:col-span-4 rounded-2xl border p-5 sm:p-6 lg:p-7 shadow-xl flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
          }`}
        >
          <div className="space-y-4 sm:space-y-5">
            {/* Header Status */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-700/40">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold leading-tight">Barcode Scanner</h3>
                  <span className="text-xs sm:text-sm text-emerald-500 flex items-center gap-1.5 font-medium mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Scanner Gun Ready
                  </span>
                </div>
              </div>

              {/* Camera Scanner Toggle Button */}
              <button
                type="button"
                onClick={() => setCameraScannerActive(!cameraScannerActive)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
                  cameraScannerActive
                    ? isDark
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                    : isDark
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                }`}
                title="Toggle Camera Barcode Scanner"
              >
                <Camera className={`w-4 h-4 ${cameraScannerActive ? 'animate-pulse text-amber-500' : ''}`} />
                <span>{cameraScannerActive ? 'Active' : 'Camera Scan'}</span>
              </button>
            </div>

            {/* Instruction */}
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Scan parcel barcode with USB scanner gun, or enter code below:
            </p>

            {/* Barcode Form */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Scan className="w-5 h-5" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  disabled={isRecording}
                  placeholder={isRecording ? 'Recording active...' : 'Enter or scan barcode...'}
                  className={`barcode-scanner-target w-full rounded-xl pl-11 pr-14 py-3 sm:py-3.5 text-sm sm:text-base font-mono transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 ${
                    isDark
                      ? 'bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500'
                      : 'bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs sm:text-sm ${
                      isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Action Button: Start Record or STOP */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition animate-pulse"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>STOP & SAVE ({activeBarcode})</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Recording</span>
                </button>
              )}
            </form>
          </div>

          {/* Quick Info Footer in Sidebar */}
          <div
            className={`mt-6 pt-4 border-t text-xs sm:text-sm flex items-center justify-between ${
              isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
            }`}
          >
            <span>Auto-Save Mode:</span>
            <span className="font-mono text-emerald-500 font-bold">[Barcode].webm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
