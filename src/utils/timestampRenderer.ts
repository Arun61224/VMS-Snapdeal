import { TimestampConfig } from '../types';

export function computeCurrentDateTime(
  config: TimestampConfig,
  startTimeRef: number, // performance.now() when recording or preview started
  customStartTimestampMs?: number
): Date {
  if (config.mode === 'realtime') {
    return new Date();
  }

  if (config.mode === 'custom_offset') {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.offsetMinutes);
    return d;
  }

  // Custom fixed or running from custom start
  if (config.mode === 'custom_fixed') {
    const base = customStartTimestampMs ?? (config.customDateTime ? new Date(config.customDateTime).getTime() : Date.now());
    const elapsed = performance.now() - startTimeRef;
    return new Date(base + elapsed);
  }

  return new Date();
}

export function formatDateTime(
  date: Date,
  config: TimestampConfig
): { dateStr: string; timeStr: string; fullStr: string } {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mmm = monthNames[date.getMonth()];

  let dateStr = `${yyyy}-${mm}-${dd}`;
  if (config.dateFormat === 'DD/MM/YYYY') {
    dateStr = `${dd}/${mm}/${yyyy}`;
  } else if (config.dateFormat === 'DD-MM-YYYY') {
    dateStr = `${dd}-${mm}-${yyyy}`;
  } else if (config.dateFormat === 'DD-MMM-YYYY') {
    dateStr = `${dd}-${mmm}-${yyyy}`;
  }

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  let timeStr = '';
  if (config.timeFormat === '12h') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, '0');
    timeStr = `${hh}:${minutes}`;
    if (config.showSeconds) timeStr += `:${seconds}`;
    if (config.showMilliseconds) timeStr += `.${ms}`;
    timeStr += ` ${ampm}`;
  } else {
    const hh = String(hours).padStart(2, '0');
    timeStr = `${hh}:${minutes}`;
    if (config.showSeconds) timeStr += `:${seconds}`;
    if (config.showMilliseconds) timeStr += `.${ms}`;
  }

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr}  ${timeStr}`
  };
}

export function drawTimestampOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TimestampConfig,
  currentDate: Date,
  activeBarcode: string | null,
  isRecording: boolean,
  recordingDurationSeconds: number
): void {
  const { dateStr, timeStr } = formatDateTime(currentDate, config);

  // Scaled font size relative to standard 1080p
  const scale = Math.max(width / 1280, 0.75);
  const fontSize = Math.round(config.fontSize * scale);
  const padding = Math.round(14 * scale);
  const margin = Math.round(20 * scale);
  const lineHeight = Math.round(fontSize * 1.35);

  ctx.save();
  ctx.font = `bold ${fontSize}px "Courier New", "SF Mono", Consolas, monospace`;
  ctx.textBaseline = 'top';

  // Lines to render in timestamp block
  const lines: string[] = [];
  lines.push(`${dateStr}  ${timeStr}`);

  if (config.stationText || config.operatorName) {
    const parts: string[] = [];
    if (config.stationText) parts.push(config.stationText);
    if (config.operatorName) parts.push(`OP: ${config.operatorName}`);
    lines.push(parts.join(' | '));
  }

  if (config.showBarcodeWatermark && activeBarcode) {
    lines.push(`PKG BARCODE: [ ${activeBarcode} ]`);
  }

  // Calculate box dimensions
  let maxTextWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxTextWidth) maxTextWidth = w;
  }

  const boxWidth = maxTextWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  // Compute position
  let boxX = margin;
  let boxY = margin;

  if (config.position === 'top-right') {
    boxX = width - boxWidth - margin;
    boxY = margin;
  } else if (config.position === 'bottom-left') {
    boxX = margin;
    boxY = height - boxHeight - margin;
  } else if (config.position === 'bottom-right') {
    boxX = width - boxWidth - margin;
    boxY = height - boxHeight - margin;
  }

  // Draw semi-transparent background box
  if (config.bgColor !== 'transparent') {
    ctx.fillStyle = config.bgColor;
    // Rounded rect
    const radius = 6 * scale;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
  }

  // Text shadow for high contrast on bright packaging / white surfaces
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Draw text lines
  ctx.fillStyle = config.textColor;
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + padding, boxY + padding + i * lineHeight);
  });

  // If recording, render a prominent blinking REC badge
  if (isRecording && config.showRecBlinker) {
    const recBadgeHeight = Math.round(32 * scale);
    const recBadgeWidth = Math.round(140 * scale);
    const recX = config.position.startsWith('top') ? (config.position === 'top-left' ? width - recBadgeWidth - margin : margin) : margin;
    const recY = margin;

    // Background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(recX, recY, recBadgeWidth, recBadgeHeight, 16 * scale);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Blinking dot (toggles every 500ms)
    const isBlinkOn = Math.floor(performance.now() / 500) % 2 === 0;
    if (isBlinkOn) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(recX + 18 * scale, recY + recBadgeHeight / 2, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Format duration mm:ss
    const mins = String(Math.floor(recordingDurationSeconds / 60)).padStart(2, '0');
    const secs = String(recordingDurationSeconds % 60).padStart(2, '0');

    ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`REC ${mins}:${secs}`, recX + 32 * scale, recY + (recBadgeHeight - Math.round(14 * scale)) / 2);
  }

  ctx.restore();
}
