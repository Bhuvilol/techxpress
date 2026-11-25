// College ID card images sent with the registration form.
//
// The form shrinks the photo in the browser and sends it as a base64 data URL
// ("data:image/jpeg;base64,..."). Here we decode it, check the real file type
// from its first bytes (never trust the declared type), and cap the size.

export const ID_CARD_MAX_BYTES = 1.5 * 1024 * 1024; // decoded size
// Base64 is 4/3 of the binary size; allow for the "data:...;base64," prefix.
export const ID_CARD_MAX_DATA_URL_CHARS = Math.ceil((ID_CARD_MAX_BYTES * 4) / 3) + 64;

const SIGNATURES = [
  { mimeType: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mimeType: 'image/png',
    test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mimeType: 'image/webp',
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Returns { mimeType, sizeBytes, data } or { error } with a message for the form.
export const parseIdCardDataUrl = (value) => {
  if (typeof value !== 'string' || !value) return { error: 'Upload a photo of your college ID card.' };
  if (value.length > ID_CARD_MAX_DATA_URL_CHARS) return { error: 'ID card image is too large — 1.5 MB at most.' };
  const match = DATA_URL.exec(value);
  if (!match) return { error: 'ID card must be a JPG, PNG or WebP image.' };

  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0) return { error: 'Upload a photo of your college ID card.' };
  if (data.length > ID_CARD_MAX_BYTES) return { error: 'ID card image is too large — 1.5 MB at most.' };

  const kind = SIGNATURES.find((s) => s.test(data));
  if (!kind) return { error: 'ID card must be a JPG, PNG or WebP image.' };
  return { mimeType: kind.mimeType, sizeBytes: data.length, data };
};
