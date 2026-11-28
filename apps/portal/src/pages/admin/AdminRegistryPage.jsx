import { useEffect, useRef, useState } from 'react';
import { Camera, Search, ScanLine, Users, Crown } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ParticipantDetails } from '../../components/admin/ParticipantDetails.jsx';
import { IdCardModal } from '../../components/verification/IdCardModal.jsx';

// Check-in desk (replaces the old college-registry list at /admin/registry).
// Scan a student's QR from their dashboard, or type their passenger
// reference (TXP-XXXX-XXXX) or registration number, to open their full
// details and their team.

const STATUS_TONE = { FORMING: 'warn', QUALIFIED: 'live', FINALIZED: 'cyan', DISQUALIFIED: 'crit' };

export const AdminRegistryPage = () => {
  const [ref, setRef] = useState('');
  const [result, setResult] = useState(null); // { participant, team }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [idCardFor, setIdCardFor] = useState(null);
  const inputRef = useRef(null);

  const lookup = async (value) => {
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      setResult(await api.get('/api/admin/verification/participant', { query: { ref: q } }));
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onScanned = (text) => {
    setScanning(false);
    setRef(text.match(/TXP-[0-9A-Z]{4}-[0-9A-Z]{4}/i)?.[0].toUpperCase() ?? text);
    lookup(text);
  };

  const { participant: p, team } = result ?? {};

  return (
    <>
      <PageHeader
        kicker="Check-in"
        title="Participant lookup"
        description="Scan a student's QR from their dashboard, or enter their passenger reference (TXP-XXXX-XXXX) or registration number."
      />

      <form
        className="mb-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); lookup(ref); }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            ref={inputRef}
            className="input-glass w-full !pl-9 font-mono uppercase"
            placeholder="TXP-XXXX-XXXX or registration number"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="glow-button inline-flex items-center justify-center gap-2" disabled={busy || !ref.trim()}>
          {busy ? <Spinner size={14} /> : <Search size={14} />} Look up
        </button>
        <button type="button" className="ghost-button inline-flex items-center justify-center gap-2" onClick={() => setScanning(true)}>
          <Camera size={14} /> Scan QR
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-[4px] border border-status-crit/40 bg-status-crit/5 px-4 py-3 font-mono text-[12px] text-status-crit">
          {error}
        </div>
      )}

      {!p && !error && !busy && (
        <div className="flex flex-col items-center gap-3 rounded-[4px] border border-dashed border-white/10 py-16 text-center text-text-dim">
          <ScanLine size={32} />
          <p className="font-mono text-[12px]">Scan a QR or enter a reference to see a participant.</p>
        </div>
      )}

      {p && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <ParticipantDetails
            user={p}
            isLeader={team?.isLeader}
            joinedAt={team?.joinedAt ?? null}
            onViewIdCard={setIdCardFor}
          />

          <aside className="glass-card flat space-y-3 self-start">
            <div className="kicker flex items-center gap-1.5"><Users size={12} /> Team</div>
            {team ? (
              <>
                <div>
                  <div className="font-sans text-[15px] font-bold">{team.name}</div>
                  <div className="font-mono text-[11px] text-text-dim">{team.publicId}</div>
                </div>
                <Badge tone={STATUS_TONE[team.status]} dot>{team.status}</Badge>
                <div className="font-mono text-[12px] text-text-secondary">
                  {team.domain?.name}{team.problemStatement && ` · ${team.problemStatement.title}`}
                </div>
                <ul className="space-y-1 border-t border-white/5 pt-3 font-mono text-[12px]">
                  {team.members.map((m) => (
                    <li key={m.id} className={`flex items-center gap-1.5 ${m.id === p.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {m.isLeader && <Crown size={12} className="text-status-warn" aria-label="Leader" />}
                      <span className="truncate">{m.fullName}</span>
                      <button
                        type="button"
                        className="ml-auto text-[11px] text-text-dim underline hover:text-text-primary"
                        onClick={() => { setRef(m.publicId); lookup(m.publicId); }}
                        disabled={m.id === p.id}
                      >
                        {m.id === p.id ? 'viewing' : 'open'}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="font-mono text-[12px] text-text-dim">Not in a team yet.</p>
            )}
          </aside>
        </div>
      )}

      {scanning && <ScannerModal onResult={onScanned} onClose={() => { setScanning(false); inputRef.current?.focus(); }} />}
      {idCardFor && <IdCardModal student={idCardFor} basePath="/api/admin/verification" onClose={() => setIdCardFor(null)} />}
    </>
  );
};

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

const ScannerModal = ({ onResult, onClose }) => {
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
    <Modal open onClose={onClose} title="Scan participant QR">
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
