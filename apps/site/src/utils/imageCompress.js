// Shrinks a photo in the browser before upload so it fits services/api's 1.5 MB cap.
const MAX_SIDE = 1600;
const TARGET_BYTES = 900 * 1024;
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];

const dataUrlBytes = (dataUrl) => {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Try a JPG, PNG, or WebP file.'));
    };
    img.src = url;
  });

export const compressImage = async (file) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose a photo file (JPG, PNG, or WebP).');
  }
  const img = await loadImage(file);
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let dataUrl = '';
  for (const q of QUALITIES) {
    dataUrl = canvas.toDataURL('image/jpeg', q);
    if (dataUrlBytes(dataUrl) <= TARGET_BYTES) break;
  }

  const bytes = dataUrlBytes(dataUrl);
  if (bytes > 1.4 * 1024 * 1024) {
    throw new Error('This image is too large even after resizing. Try a smaller photo.');
  }

  return { dataUrl, bytes, width, height };
};
