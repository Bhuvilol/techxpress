// Shrinks a photo in the browser before upload: at most MAX_SIDE pixels on the
// long side, re-encoded as JPEG, lowering quality until it fits TARGET_BYTES.
// A 3–8 MB phone photo usually ends up around 200–400 KB, so registration
// works on slow mobile data and the database stays small.
//
// The server accepts at most 1.5 MB (services/api/src/utils/idCard.js).

const MAX_SIDE = 1600;
const TARGET_BYTES = 900 * 1024;
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];

// Base64 length → decoded bytes.
const dataUrlBytes = (dataUrl) => {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
};

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
  img.src = url;
});

// Returns { dataUrl, bytes, width, height }. Throws Error with a message
// suitable for the form.
export const compressImage = async (file) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (a photo or scan of your ID card).');
  }
  let img;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error('This image couldn’t be opened. Try a JPG or PNG photo instead.');
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // White behind transparent PNGs (JPEG has no transparency).
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
    throw new Error('This image is too large even after shrinking. Try a smaller photo.');
  }
  return { dataUrl, bytes, width, height };
};
