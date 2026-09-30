import { RecordedVideo } from '../types';
import { getAllVideos, saveVideo } from './db';

/**
 * Creates an initial sample video with the exact Snapdeal parcel barcode 'SDLC1078691604'
 * so the user immediately sees how their packaging VMS dashboard looks!
 */
export async function seedInitialSampleIfEmpty(): Promise<RecordedVideo[]> {
  try {
    const existing = await getAllVideos();
    if (existing && existing.length > 0) {
      return existing;
    }

    // Generate a lightweight canvas animation and record 2 seconds
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    if (!ctx) return [];

    const stream = canvas.captureStream(15);
    const chunks: Blob[] = [];

    let mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = '';
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
      };
    });

    recorder.start();

    // Render 25 frames
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // Background packing station
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Packing mat
      ctx.fillStyle = '#27272a';
      ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Snapdeal white/red parcel
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(160, 90, 320, 200);

      // Red banner on parcel
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(160, 260, 320, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('snapdeal', 270, 282);

      // Barcode sticker
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(200, 110, 240, 130);
      ctx.strokeRect(200, 110, 240, 130);

      // Barcode bars representation
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 40; i++) {
        const barW = (i % 3 === 0) ? 4 : (i % 2 === 0 ? 2 : 3);
        ctx.fillRect(220 + i * 5, 130, barW, 60);
      }

      ctx.font = 'bold 13px monospace';
      ctx.fillText('SDLC1078691604', 250, 215);

      // VMS Burnt-in Timestamp
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(15, 15, 300, 45);
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 12px monospace';
      const now = new Date();
      ctx.fillText(`${now.toISOString().slice(0, 10)}  ${now.toTimeString().slice(0, 8)}`, 25, 32);
      ctx.fillText(`PKG BARCODE: [ SDLC1078691604 ]`, 25, 48);

      if (frame >= 30) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 60);

    const videoBlob = await recordPromise;
    const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

    const sampleVideo: RecordedVideo = {
      id: `sample_snapdeal_${Date.now()}`,
      barcode: 'SDLC1078691604',
      title: 'SDLC1078691604.webm',
      blob: videoBlob,
      thumbnailUrl: thumbnail,
      duration: 3,
      fileSize: videoBlob.size,
      createdAt: new Date().toISOString(),
      stationName: 'PACKING STATION-01',
      notes: 'Initial sample demonstration packet (Snapdeal)',
    };

    await saveVideo(sampleVideo);
    return [sampleVideo];
  } catch (e) {
    console.warn('Sample video seeding skipped:', e);
    return [];
  }
}
