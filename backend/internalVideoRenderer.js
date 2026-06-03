const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolveFfmpegPath() {
  const localPath = path.join(__dirname, '../tools/ffmpeg.exe');
  if (fs.existsSync(localPath)) return localPath;
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch (_) {
    return process.env.FFMPEG_PATH || 'ffmpeg';
  }
}

function safeSlug(value) {
  return String(value || 'evics-video')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'evics-video';
}

function cleanText(value, fallback) {
  return String(value || fallback || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\:']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 88);
}

function sceneText(components) {
  const textItems = (components || [])
    .map((component) => cleanText(component.text || component.hook || component.product || component.type, ''))
    .filter(Boolean);
  if (!textItems.length) {
    return [
      'EVICS Viral Intelligence',
      'Hook matched to product',
      'Script and visual direction created',
      'Ready for review'
    ];
  }
  return textItems.slice(0, 4);
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${command} exited with ${code}`));
    });
  });
}

async function renderInternalVideo({ components, duration = 10, aspect = '9:16', style = 'UGC' }) {
  const ffmpeg = resolveFfmpegPath();
  const seconds = Math.max(6, Math.min(20, Number.parseInt(duration, 10) || 10));
  const isSquare = aspect === '1:1';
  const isWide = aspect === '16:9';
  const width = isSquare ? 1080 : isWide ? 1280 : 720;
  const height = isSquare ? 1080 : isWide ? 720 : 1280;
  const generatedDir = path.join(__dirname, '../generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  const scenes = sceneText(components);
  const title = cleanText(scenes[0], 'EVICS Viral Ad');
  const filename = `${safeSlug(title)}-${Date.now()}.mp4`;
  const outputPath = path.join(generatedDir, filename);
  const fontFile = 'C\\:/Windows/Fonts/arial.ttf';
  const sceneLength = seconds / scenes.length;

  const drawFilters = scenes.map((text, index) => {
    const start = Math.round(index * sceneLength * 10) / 10;
    const end = Math.round((index + 1) * sceneLength * 10) / 10;
    const y = index === 0 ? '(h-text_h)/2-120' : '(h-text_h)/2';
    const size = index === 0 ? 52 : 42;
    return `drawtext=fontfile='${fontFile}':text='${cleanText(text, 'EVICS')}':fontcolor=white:fontsize=${size}:box=1:boxcolor=black@0.45:boxborderw=26:x=(w-text_w)/2:y=${y}:enable='between(t,${start},${end})'`;
  });

  drawFilters.push(`drawtext=fontfile='${fontFile}':text='${cleanText(style, 'UGC')} | EVICS proof render':fontcolor=white@0.88:fontsize=26:x=44:y=h-86`);
  drawFilters.push('format=yuv420p');

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x173225:s=${width}x${height}:d=${seconds}:r=30`,
    '-f', 'lavfi',
    '-i', `sine=frequency=440:duration=${seconds}:sample_rate=44100`,
    '-vf', drawFilters.join(','),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'stillimage',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    outputPath
  ];

  await runProcess(ffmpeg, args);
  const stats = fs.statSync(outputPath);
  return {
    path: outputPath,
    filename,
    url: `/generated/${filename}`,
    duration: seconds,
    bytes: stats.size
  };
}

module.exports = {
  renderInternalVideo
};
