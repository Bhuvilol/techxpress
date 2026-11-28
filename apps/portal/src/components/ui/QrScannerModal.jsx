import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.jsx';

// A student's QR (dashboard boarding pass or e-ticket) holds their passenger
// reference, TXP-XXXX-XXXX. Pulls it out of a scan or typed value, else null.
export const passengerRefIn = (text) => (text ?? '').match(/TXP-[0-9A-Z]{4}-[0-9A-Z]{4}/i)?.[0].toUpperCase() ?? null;

// Camera QR scanner. Uses the back camera where there is one, in HD so small
// codes on a phone screen still resolve. Reads with the browser's own
// BarcodeDetector where it exists (Chrome / Edge / Android: fast and good with
// real cameras), else with ZXing. Stops the camera as soon
// as a code is read or the modal closes.
const VIDEO_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

const nativeQrDetector = async () => {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    return formats.includes('qr_code') ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
  } catch {
    return null;
  }
};

export const QrScannerModal = ({ onResult, onClose, title = 'Scan participant QR' }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Starting camera…');
  const doneRef = useRef(false);
  const onResultRef = useRef(onResult); // latest callback without restarting the camera
  onResultRef.current = onResult;

  useEffect(() => {
    let stream;
    let timer;
    let zxingControls;
    let cancelled = false;

    const finish = (text) => {
      if (doneRef.current || cancelled) return;
      doneRef.current = true;
      onResultRef.current(text);
    };

    (async () => {
      try {
        const detector = await nativeQrDetector();
        if (detector) {
          stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
          if (cancelled) return;
          // Keep refocusing (Android), so a QR held close on another phone's
          // screen stays sharp. Ignored where the camera doesn't support it.
          const [track] = stream.getVideoTracks();
          if (track?.getCapabilities?.().focusMode?.includes('continuous')) {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
          const video = videoRef.current;
          video.srcObject = stream;
          await video.play();
          setHint('Looking for a QR code…');
          const tick = async () => {
            if (cancelled || doneRef.current) return;
            try {
              if (video.readyState >= 2) {
                const [code] = await detector.detect(video);
                if (code?.rawValue) return finish(code.rawValue);
              }
            } catch { /* frame not ready; try the next one */ }
            timer = setTimeout(tick, 150);
          };
          tick();
        } else {
          const { BrowserQRCodeReader } = await import('@zxing/browser'); // loaded only when needed
          const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
          zxingControls = await reader.decodeFromConstraints(VIDEO_CONSTRAINTS, videoRef.current, (res) => {
            if (res) finish(res.getText());
          });
          if (cancelled) zxingControls.stop();
          else setHint('Looking for a QR code…');
        }
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the reference instead.'
            : e?.name === 'NotFoundError'
              ? 'No camera found on this device. Type the reference instead.'
              : `Could not start the camera: ${e?.message ?? e}`,
        );
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Modal open onClose={onClose} title={title}>
      {error ? (
        <p className="font-mono text-[12px] text-status-crit">{error}</p>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[4px] bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-[15%] rounded-[4px] border-2 border-status-warn/80" />
          </div>
          <p className="mt-3 text-center font-mono text-[12px] text-text-dim">
            {hint} Hold the QR (dashboard or e-ticket) steady, filling about half the frame.
          </p>
        </>
      )}
    </Modal>
  );
};
