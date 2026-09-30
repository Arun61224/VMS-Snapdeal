import { TimestampConfig } from '../types';

export function computeCurrentDateTime(
  config: TimestampConfig,
  startTimeRef: number,
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
  isRecording: boolean,
  recordingDurationSeconds: number
): void {
  const { dateStr, timeStr } = formatDateTime(currentDate, config);

  const scale = Math.max(width / 1280, 0.75);
  const fontSize = Math.round(config.fontSize * scale);
  const paddingX = Math.round(14 * scale);
  const paddingY = Math.round(10 * scale);
  const margin = Math.round(18 * scale);

  ctx.save();
  ctx.font = `bold ${fontSize}px "Courier New", "SF Mono", Consolas, monospace`;
  ctx.textBaseline = 'top';

  // ONLY Date and Time Stamp line
  const stampText = `${dateStr}  ${timeStr}`;
  const textWidth = ctx.measureText(stampText).width;

  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

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

  // Draw semi-transparent or solid background
  if (config.bgColor !== 'transparent') {
    ctx.fillStyle = config.bgColor;
    const radius = 6 * scale;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
  }

  // High contrast drop shadow
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Draw the date & time text
  ctx.fillStyle = config.textColor;
  ctx.fillText(stampText, boxX + paddingX, boxY + paddingY);

  // If recording, render REC indicator
  if (isRecording && config.showRecBlinker) {
    const recBadgeHeight = Math.round(30 * scale);
    const recBadgeWidth = Math.round(135 * scale);
    const recX = config.position.startsWith('top') ? (config.position === 'top-left' ? width - recBadgeWidth - margin : margin) : margin;
    const recY = margin;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(recX, recY, recBadgeWidth, recBadgeHeight, 15 * scale);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const isBlinkOn = Math.floor(performance.now() / 500) % 2 === 0;
    if (isBlinkOn) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(recX + 16 * scale, recY + recBadgeHeight / 2, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    const mins = String(Math.floor(recordingDurationSeconds / 60)).padStart(2, '0');
    const secs = String(recordingDurationSeconds % 60).padStart(2, '0');

    ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`REC ${mins}:${secs}`, recX + 30 * scale, recY + (recBadgeHeight - Math.round(13 * scale)) / 2);
  }

  ctx.restore();
}
