// Sends an ID card image to an admin or coordinator. Personal data: never
// cached, never sniffed as another type, and shown inline only.
export const sendIdCard = (res, card) => {
  res.set({
    'Content-Type': card.mimeType,
    'Content-Length': String(card.sizeBytes),
    'Cache-Control': 'no-store, private',
    'Content-Disposition': 'inline; filename="id-card"',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(Buffer.from(card.data));
};
