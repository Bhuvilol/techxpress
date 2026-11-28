import { useEffect, useState } from 'react';

// The student's passenger reference as a QR, shown at the check-in desk.
// Admins scan it on Admin → Check-in. It holds only the reference
// (TXP-XXXX-XXXX), which is useless without an admin login.
export const BoardingPassQr = ({ publicId }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    import('qrcode') // loaded only for students who have a reference
      .then(({ toDataURL }) => toDataURL(publicId, { margin: 1, width: 240, errorCorrectionLevel: 'M' }))
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [publicId]);

  return (
    <div className="border-t border-border-dim pt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2.5">Boarding pass</div>
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-[180px] w-[180px] place-items-center rounded-[3px] bg-white p-2">
          {src ? <img src={src} alt={`QR code for ${publicId}`} className="h-full w-full" /> : <span className="font-mono text-[11px] text-black/50">…</span>}
        </div>
        <div className="font-mono text-[13px] tracking-[0.12em] text-text-primary">{publicId}</div>
        <p className="text-center font-mono text-[11px] text-text-dim">Show this at the check-in desk.</p>
      </div>
    </div>
  );
};
