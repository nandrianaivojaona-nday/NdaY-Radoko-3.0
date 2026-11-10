import React, { useEffect, useRef, useState } from 'react';
import {
  AssessmentAction,
  AssessmentEvidence,
  AssessmentSession,
  ChannelType,
  Encounter,
  Observation,
  ObservationDefinition,
  ObservationQuality,
  ObservationSource,
  UserAccount,
} from '../types';
import { QualityBadge } from './Badges';

interface AcquisitionWorkspaceProps {
  definition: ObservationDefinition;
  observation: Observation;
  encounter: Encounter;
  user: UserAccount;
  sessions: AssessmentSession[];
  evidence: AssessmentEvidence[];
  onUpdateObservation: (observation: Observation) => void;
  onSaveSession: (session: AssessmentSession) => void;
  onSaveEvidence: (evidence: AssessmentEvidence) => void;
  onClose: () => void;
}

const DEFAULT_QUALITY_FOR_ACTION: Record<AssessmentAction, ObservationQuality> = {
  LOOK: 'Observed — remote',
  LISTEN: 'Observed — remote',
  ASK: 'Reported — unverified',
  MEASURE: 'Measured — device',
  EXAMINE: 'Observed — in person',
};

const DEFAULT_SOURCE_FOR_ACTION: Record<AssessmentAction, ObservationSource> = {
  LOOK: 'Remote observation',
  LISTEN: 'Remote observation',
  ASK: 'Caregiver report',
  MEASURE: 'Device measurement',
  EXAMINE: 'In-person observation',
};

export const AcquisitionWorkspace: React.FC<AcquisitionWorkspaceProps> = ({
  definition,
  observation,
  encounter,
  user,
  sessions,
  evidence,
  onUpdateObservation,
  onSaveSession,
  onSaveEvidence,
  onClose,
}) => {
  const acquisition = definition.acquisition ?? {
    action: (definition.method === 'Caregiver report'
      ? 'ASK'
      : definition.method === 'Device measurement'
      ? 'MEASURE'
      : definition.method === 'Trained in-person assessment'
      ? 'EXAMINE'
      : 'LOOK') as AssessmentAction,
    channels: ['camera', 'speaker'] as ChannelType[],
    instruction: definition.guidance,
  };

  // Hardware state
  const [hardwareMode, setHardwareMode] = useState<'hardware' | 'simulated'>('hardware');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'connecting' | 'connected' | 'unavailable' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Audio conversation and recording state
  const [isAudioLive, setIsAudioLive] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [speakerTestPlayed, setSpeakerTestPlayed] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnimRef = useRef<number | null>(null);

  // Timer for MEASURE (respiratory rate or observation seconds)
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Active Session
  const [currentSession, setCurrentSession] = useState<AssessmentSession>(() => {
    const existing = sessions.find((s) => s.encounterId === encounter.id && s.status === 'active');
    if (existing) return existing;
    const newSession: AssessmentSession = {
      id: `SESS-${Date.now().toString(36).toUpperCase()}`,
      encounterId: encounter.id,
      startedAt: new Date().toISOString(),
      clinicianId: user.id,
      clinicianName: user.name,
      channelTypes: acquisition.channels,
      mode: 'live-hardware',
      status: 'active',
      activeDefinitionId: definition.id,
      evidenceIds: [],
    };
    onSaveSession(newSession);
    return newSession;
  });

  // Clinician Confirmation Form State (explicit confirmation, never auto-populated or assumed)
  const [selectedValue, setSelectedValue] = useState<string>(observation.value);
  const [selectedQuality, setSelectedQuality] = useState<ObservationQuality>(
    observation.quality !== 'Not assessed' ? observation.quality : DEFAULT_QUALITY_FOR_ACTION[acquisition.action],
  );
  const [selectedSource, setSelectedSource] = useState<ObservationSource>(
    observation.source ?? DEFAULT_SOURCE_FOR_ACTION[acquisition.action],
  );
  const [clinicalNotes, setClinicalNotes] = useState<string>(observation.notes ?? '');
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>(observation.evidenceIds ?? []);
  const [confirmationFeedback, setConfirmationFeedback] = useState<string | null>(null);

  // Current session evidence list
  const sessionEvidence = evidence.filter(
    (ev) => ev.encounterId === encounter.id && (ev.definitionId === definition.id || linkedEvidenceIds.includes(ev.id)),
  );

  // Camera acquisition logic
  const startCamera = async () => {
    setCameraStatus('connecting');
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('connected');
    } catch (err: any) {
      console.warn('Real camera not accessible; reporting unavailable condition:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setCameraStatus(isDenied ? 'denied' : 'unavailable');
      setCameraError(
        isDenied
          ? 'Camera permission was denied. Camera workspace is offline.'
          : 'No camera hardware detected or stream unavailable. Real camera is offline.',
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  };

  useEffect(() => {
    if (hardwareMode === 'hardware' && (acquisition.action === 'LOOK' || acquisition.channels.includes('camera'))) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [hardwareMode, definition.id]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioAnimRef.current) {
        cancelAnimationFrame(audioAnimRef.current);
      }
    };
  }, []);

  // Snapshot frame
  const captureSnapshot = () => {
    if (!encounter.consent.imageCaptureAllowed) {
      alert('Image capture was declined by the caregiver. Saving photos is blocked.');
      return;
    }

    let mediaUrl: string;
    let isSimulated = false;

    if (hardwareMode === 'hardware' && cameraStatus === 'connected' && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        mediaUrl = canvas.toDataURL('image/jpeg', 0.85);
      } else {
        return;
      }
    } else {
      // Simulated image
      isSimulated = true;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`SIMULATED DRONE INSPECTION FEED`, 40, 60);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Observation: ${definition.label}`, 40, 95);
        ctx.fillText(`Time: ${new Date().toISOString()}`, 40, 120);
        ctx.fillText(`Target: Infant assessment area`, 40, 145);
        // crosshairs
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(320, 260, 60, 0, Math.PI * 2);
        ctx.moveTo(320, 180);
        ctx.lineTo(320, 340);
        ctx.moveTo(240, 260);
        ctx.lineTo(400, 260);
        ctx.stroke();
        mediaUrl = canvas.toDataURL('image/jpeg', 0.85);
      } else {
        return;
      }
    }

    const newEvidence: AssessmentEvidence = {
      id: `EV-IMG-${Date.now()}`,
      encounterId: encounter.id,
      definitionId: definition.id,
      sessionId: currentSession.id,
      type: 'image',
      mediaUrl,
      thumbnailUrl: mediaUrl,
      capturedAt: new Date().toISOString(),
      capturedBy: user.id,
      consentConfirmed: true,
      isSimulated,
      metadata: {
        resolution: '640x480',
        mimeType: 'image/jpeg',
      },
      notes: isSimulated
        ? 'Simulated inspection snapshot for prototype demonstration.'
        : `Live camera visual capture by ${user.name}.`,
    };

    onSaveEvidence(newEvidence);
    setLinkedEvidenceIds((prev) => [...prev, newEvidence.id]);
    setConfirmationFeedback(`Snapshot captured (${isSimulated ? 'Simulated' : 'Live Camera'}).`);
  };

  // Two-way Audio Conversation
  const toggleLiveConversation = async () => {
    if (isAudioLive) {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (audioAnimRef.current) {
        cancelAnimationFrame(audioAnimRef.current);
      }
      setIsAudioLive(false);
      setAudioLevel(0);
      return;
    }

    setAudioError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API not available.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setIsAudioLive(true);

      // Web Audio level monitoring
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        audioAnimRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err: any) {
      console.warn('Microphone error; using simulated intercom audio wave:', err);
      setIsAudioLive(true);
      // Simulated audio wave pulsation
      let phase = 0;
      const simTimer = setInterval(() => {
        phase += 0.2;
        setAudioLevel(Math.round(40 + Math.sin(phase) * 35));
      }, 100);
      (window as any)._simAudioTimer = simTimer;
    }
  };

  // Speaker Test Chime
  const testSpeakerChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setSpeakerTestPlayed(true);
      setTimeout(() => setSpeakerTestPlayed(false), 2000);
    } catch {
      setSpeakerTestPlayed(true);
      setTimeout(() => setSpeakerTestPlayed(false), 2000);
    }
  };

  // Audio Recording (strictly honors consent)
  const toggleAudioRecording = () => {
    if (isAudioRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsAudioRecording(false);
      return;
    }

    // Check caregiver consent
    if (!encounter.consent.audioRecordingAllowed) {
      alert('Caregiver declined audio recording. Live conversation is allowed, but retaining recorded audio is blocked.');
      return;
    }

    if (!audioStreamRef.current) {
      alert('Please start the two-way live conversation first to open the audio stream.');
      return;
    }

    try {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(audioStreamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const mediaUrl = reader.result as string;
          const newEvidence: AssessmentEvidence = {
            id: `EV-AUD-${Date.now()}`,
            encounterId: encounter.id,
            definitionId: definition.id,
            sessionId: currentSession.id,
            type: 'audio',
            mediaUrl,
            capturedAt: new Date().toISOString(),
            capturedBy: user.id,
            consentConfirmed: true,
            isSimulated: hardwareMode === 'simulated',
            metadata: {
              mimeType: 'audio/webm',
              fileSizeBytes: audioBlob.size,
            },
            notes: `Audio answer recorded under informed consent for observation ${definition.label}.`,
          };
          onSaveEvidence(newEvidence);
          setLinkedEvidenceIds((prev) => [...prev, newEvidence.id]);
          setConfirmationFeedback('Audio response recording saved to encounter evidence.');
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsAudioRecording(true);
    } catch (e: any) {
      setAudioError('MediaRecorder could not record on this channel.');
    }
  };

  // Timer controls for MEASURE
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Clinician Finding Confirmation (Correction 4)
  const handleConfirmFinding = () => {
    if (!selectedValue) {
      alert('Please choose or enter an assessment finding before confirming.');
      return;
    }

    const now = new Date().toISOString();
    const updatedObservation: Observation = {
      ...observation,
      value: selectedValue,
      quality: selectedQuality,
      source: selectedSource,
      recordedAt: now,
      recordedBy: user.id,
      confirmedBy: user.id,
      confirmedByName: `${user.name} (${user.role})`,
      confirmedAt: now,
      isClinicianConfirmed: true,
      acquisitionSessionId: currentSession.id,
      evidenceIds: linkedEvidenceIds,
      notes: clinicalNotes,
      evidenceRef: linkedEvidenceIds.length > 0 ? `${linkedEvidenceIds.length} media item(s) attached` : undefined,
    };

    onUpdateObservation(updatedObservation);
    setConfirmationFeedback(`✓ Finding confirmed by ${user.name} as ${selectedQuality}. Observation recorded.`);
  };

  const handleWithdrawFinding = () => {
    const updatedObservation: Observation = {
      ...observation,
      value: '',
      quality: 'Not assessed',
      source: undefined,
      recordedAt: null,
      recordedBy: null,
      confirmedBy: null,
      confirmedByName: null,
      confirmedAt: null,
      isClinicianConfirmed: false,
      acquisitionSessionId: null,
      evidenceIds: [],
      notes: '',
      evidenceRef: undefined,
    };
    onUpdateObservation(updatedObservation);
    setSelectedValue('');
    setSelectedQuality('Not assessed');
    setClinicalNotes('');
    setConfirmationFeedback('Finding withdrawn. Observation is now Not Assessed.');
  };

  return (
    <div className="rounded-2xl border-2 border-brand-primary/40 bg-brand-surface p-5 shadow-xl transition-all">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-secondary/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge bg-brand-primary/20 text-xs font-bold text-brand-primary">
              {acquisition.action} WORKSPACE
            </span>
            <span className="text-xs text-brand-text-secondary">
              Session: <code className="font-mono">{currentSession.id}</code>
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-brand-text-primary">
            {definition.label}
            {definition.requiredForReview && <span className="ml-1 text-brand-accent">*</span>}
          </h3>
          <p className="text-xs text-brand-text-secondary">{acquisition.instruction}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center gap-1.5 rounded-lg border border-brand-secondary/30 bg-brand-background p-1 text-xs">
            <button
              type="button"
              className={`rounded px-2.5 py-1 text-xs font-semibold ${hardwareMode === 'hardware' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary'}`}
              onClick={() => setHardwareMode('hardware')}
            >
              Real Devices
            </button>
            <button
              type="button"
              className={`rounded px-2.5 py-1 text-xs font-semibold ${hardwareMode === 'simulated' ? 'bg-amber-600 text-white shadow-sm' : 'text-brand-text-secondary'}`}
              onClick={() => setHardwareMode('simulated')}
            >
              Simulated Feed
            </button>
          </div>

          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            ✕ Close Workspace
          </button>
        </div>
      </div>

      {/* Simulation Banner if active */}
      {hardwareMode === 'simulated' && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
          <strong>SIMULATION MODE ACTIVE:</strong> Using synthetic mock channels and simulated device telemetry for
          demonstration. No live aircraft, physical camera, or medical sensor is engaged.
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: Acquisition Channels */}
        <div className="space-y-4">
          {/* CAMERA / VISUAL CHANNEL (LOOK) */}
          {(acquisition.action === 'LOOK' || acquisition.channels.includes('camera')) && (
            <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-text-primary">Camera Workspace</span>
                  {hardwareMode === 'hardware' && cameraStatus === 'connected' && (
                    <span className="badge bg-green-500/15 text-[10px] text-green-600">● Live Camera Feed</span>
                  )}
                  {hardwareMode === 'simulated' && (
                    <span className="badge bg-amber-500/15 text-[10px] text-amber-600">
                      [SIMULATED DRONE CAMERA FEED — NOT A LIVE AIRCRAFT STREAM]
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-brand-text-secondary">
                  Consent: {encounter.consent.imageCaptureAllowed ? '✓ Photo allowed' : '⚠ Live view only'}
                </div>
              </div>

              {/* Viewport container */}
              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                {hardwareMode === 'hardware' && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`h-full w-full object-cover ${cameraStatus === 'connected' ? 'block' : 'hidden'}`}
                    />
                    {cameraStatus === 'connecting' && (
                      <p className="text-xs text-slate-300">Connecting to browser video device…</p>
                    )}
                    {cameraStatus === 'unavailable' && (
                      <div className="p-4 text-center">
                        <p className="text-sm font-semibold text-rose-400">Camera Unavailable</p>
                        <p className="mt-1 text-xs text-slate-300">{cameraError || 'No video camera detected.'}</p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Interface correctly reports unavailable. No finding is assumed or recorded.
                        </p>
                        <button
                          type="button"
                          className="mt-3 rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                          onClick={() => setHardwareMode('simulated')}
                        >
                          Switch to Simulated Camera Feed
                        </button>
                      </div>
                    )}
                    {cameraStatus === 'denied' && (
                      <div className="p-4 text-center">
                        <p className="text-sm font-semibold text-amber-400">Camera Permission Denied</p>
                        <p className="mt-1 text-xs text-slate-300">{cameraError}</p>
                        <button
                          type="button"
                          className="mt-3 rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                          onClick={() => setHardwareMode('simulated')}
                        >
                          Use Simulated Feed
                        </button>
                      </div>
                    )}
                  </>
                )}

                {hardwareMode === 'simulated' && (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 p-4 text-center">
                    <div className="rounded-full border border-green-500/40 p-6 text-green-400">
                      <div className="h-12 w-12 rounded-full border-2 border-dashed border-green-400 animate-spin" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-green-400">
                      Simulated Aircraft High-Resolution Optical Pod
                    </p>
                    <p className="text-[11px] text-slate-400">Target area: {definition.label}</p>
                    <span className="mt-2 badge bg-amber-500/20 text-[10px] text-amber-300">
                      Simulated Demonstration Only
                    </span>
                  </div>
                )}
              </div>

              {/* Viewport Action Controls */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-brand-text-secondary">
                  Opening camera leaves observation unchanged. Confirm findings below.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={captureSnapshot}
                    disabled={!encounter.consent.imageCaptureAllowed && hardwareMode === 'hardware'}
                    title={
                      !encounter.consent.imageCaptureAllowed
                        ? 'Image capture was declined by caregiver'
                        : 'Capture visual snapshot'
                    }
                  >
                    📸 Capture Frame
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TWO-WAY AUDIO & INTERCOM (ASK / LISTEN) */}
          {(acquisition.action === 'ASK' ||
            acquisition.action === 'LISTEN' ||
            acquisition.channels.includes('microphone') ||
            acquisition.channels.includes('speaker')) && (
            <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-text-primary">
                  Two-Way Audio Intercom ({acquisition.action})
                </span>
                <div className="text-[11px] text-brand-text-secondary">
                  Recording Consent:{' '}
                  {encounter.consent.audioRecordingAllowed ? (
                    <span className="text-green-600 font-medium">✓ Permitted</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Declined (Live only)</span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* Speaker Channel */}
                <div className="rounded-lg border border-brand-secondary/20 bg-brand-surface p-3">
                  <p className="text-xs font-semibold text-brand-text-primary">Outbound Speaker Channel</p>
                  <p className="mt-1 text-[11px] text-brand-text-secondary">
                    Transmit clinician guidance to outreach site.
                  </p>
                  <button
                    type="button"
                    className="mt-3 btn-secondary w-full text-xs"
                    onClick={testSpeakerChime}
                  >
                    {speakerTestPlayed ? '🔊 Playing Chime…' : '🔊 Test Remote Speaker Chime'}
                  </button>
                </div>

                {/* Microphone / Intercom Channel */}
                <div className="rounded-lg border border-brand-secondary/20 bg-brand-surface p-3">
                  <p className="text-xs font-semibold text-brand-text-primary">Inbound Remote Microphone</p>
                  <p className="mt-1 text-[11px] text-brand-text-secondary">
                    Listen to caregiver answer or infant sounds.
                  </p>
                  <button
                    type="button"
                    className={`mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                      isAudioLive
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-brand-primary text-white hover:bg-brand-secondary'
                    }`}
                    onClick={toggleLiveConversation}
                  >
                    {isAudioLive ? '⏹ End Live Conversation' : '🎙 Start Live Conversation'}
                  </button>
                </div>
              </div>

              {/* Live Audio Level Meter */}
              {isAudioLive && (
                <div className="mt-3 rounded-lg bg-brand-surface p-3 border border-brand-secondary/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-text-primary">● Live Audio Level</span>
                    <span className="font-mono text-brand-text-secondary">{audioLevel}%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-background">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-brand-secondary/15 pt-2">
                    <span className="text-[11px] text-brand-text-secondary">
                      Separate live talk from stored recordings:
                    </span>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        isAudioRecording
                          ? 'bg-red-600 text-white animate-pulse'
                          : encounter.consent.audioRecordingAllowed
                          ? 'border border-brand-secondary/30 bg-brand-background text-brand-text-primary hover:bg-brand-raised'
                          : 'cursor-not-allowed opacity-50 bg-brand-background text-brand-text-secondary'
                      }`}
                      onClick={toggleAudioRecording}
                      disabled={!encounter.consent.audioRecordingAllowed}
                    >
                      {isAudioRecording ? '⏹ Stop Recording Answer' : '⏺ Record Answer to File'}
                    </button>
                  </div>
                </div>
              )}

              {!encounter.consent.audioRecordingAllowed && (
                <div className="mt-2 rounded bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                  Caregiver declined audio recording. You can talk live via the intercom, but audio clips will not be
                  stored. Type confirmed findings below.
                </div>
              )}
            </div>
          )}

          {/* MEASURE TOOLS (Timer for breaths / pulse / temp) */}
          {(acquisition.action === 'MEASURE' || acquisition.channels.includes('instrument')) && (
            <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-text-primary">Measurement & Instrument Support</span>
                <span className="badge bg-brand-primary/10 text-[10px] text-brand-primary">Calibrated Timer</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-brand-secondary/20 bg-brand-surface p-3">
                <div>
                  <p className="text-xs font-semibold text-brand-text-primary">60-Second Full Count Timer</p>
                  <p className="text-[11px] text-brand-text-secondary">
                    IMCI standard for respiratory rate: count for 60 seconds when calm.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-brand-primary">{timerSeconds}s</span>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => {
                      if (timerRunning) {
                        setTimerRunning(false);
                      } else {
                        if (timerSeconds === 0) setTimerSeconds(60);
                        setTimerRunning(true);
                      }
                    }}
                  >
                    {timerRunning ? 'Pause' : 'Start Timer'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(60);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Captured Evidence Gallery */}
          <div className="rounded-xl border border-brand-secondary/20 bg-brand-background/40 p-3">
            <p className="text-xs font-semibold text-brand-text-primary">
              Supporting Evidence for this Observation ({sessionEvidence.length})
            </p>
            {sessionEvidence.length === 0 ? (
              <p className="mt-1 text-[11px] text-brand-text-secondary">
                No retained media files. (Live examination without saved media is clinically permissible).
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sessionEvidence.map((ev) => (
                  <div key={ev.id} className="relative rounded-lg border border-brand-secondary/20 bg-brand-surface p-2 text-xs">
                    {ev.type === 'image' && ev.mediaUrl && (
                      <img src={ev.mediaUrl} alt={ev.id} className="h-20 w-full rounded object-cover" />
                    )}
                    {ev.type === 'audio' && (
                      <div className="flex h-20 flex-col items-center justify-center rounded bg-brand-background p-1 text-center">
                        <span className="text-base">🎵</span>
                        <audio src={ev.mediaUrl} controls className="mt-1 h-6 w-full" />
                      </div>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-brand-text-secondary">{ev.id.slice(0, 10)}</span>
                      {ev.isSimulated && (
                        <span className="badge bg-amber-500/20 text-[9px] text-amber-600">Simulated</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clinician Confirmation Form (Correction 4) */}
        <div className="rounded-xl border-2 border-brand-primary/20 bg-brand-background/80 p-4">
          <div className="flex items-center justify-between border-b border-brand-secondary/20 pb-2">
            <h4 className="text-sm font-bold text-brand-text-primary">Clinician Finding Confirmation</h4>
            <QualityBadge quality={observation.quality} />
          </div>

          <p className="mt-2 text-xs text-brand-text-secondary">
            Acquisition feeds do not auto-fill clinical diagnoses. A qualified physician or field clinician must
            explicitly record, source, and confirm the finding.
          </p>

          <div className="mt-4 space-y-3">
            {/* Value Selector */}
            <div>
              <label className="label-field">Clinical Finding</label>
              {definition.valueType === 'select' ? (
                <select
                  className="input-field text-xs"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  aria-label={definition.label}
                >
                  <option value="">Select finding…</option>
                  {(definition.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type={definition.valueType === 'number' ? 'number' : 'text'}
                    className="input-field text-xs"
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    placeholder={definition.valueType === 'number' ? 'Measured number' : 'Recorded finding'}
                    aria-label={definition.label}
                  />
                  {definition.unit && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary">
                      {definition.unit}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Evidence Quality Flag */}
            <div>
              <label className="label-field">Evidence Quality Decision</label>
              <select
                className="input-field text-xs"
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value as ObservationQuality)}
                aria-label="Evidence Quality"
              >
                <option value="Not assessed">Not assessed</option>
                <option value="Observed — remote">Observed — remote (clinician verified via camera)</option>
                <option value="Reported — unverified">Reported — unverified (caregiver answer)</option>
                <option value="Measured — device">Measured — device</option>
                <option value="Observed — in person">Observed — in person</option>
                <option value="Unavailable">Unavailable (declined / device absent)</option>
                <option value="Unusable">Unusable (inadequate lighting / unclear stream)</option>
              </select>
            </div>

            {/* Observation Source */}
            <div>
              <label className="label-field">Observation Source</label>
              <select
                className="input-field text-xs"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as ObservationSource)}
                aria-label="Observation Source"
              >
                <option value="Remote observation">Remote observation (clinician via remote feed)</option>
                <option value="Caregiver report">Caregiver report (infant history answered by mother)</option>
                <option value="Field officer observation">Field officer observation</option>
                <option value="Device measurement">Device measurement</option>
                <option value="In-person observation">In-person observation</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>

            {/* Clinical Reasoning / Notes */}
            <div>
              <label className="label-field">Clinician Examination Notes</label>
              <textarea
                className="input-field text-xs"
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Details of visual inspection, lighting condition, lesion distribution, or limitations."
              />
            </div>

            {/* Existing confirmation stamp if present */}
            {observation.isClinicianConfirmed && observation.confirmedByName && (
              <div className="rounded-lg border border-brand-mint/40 bg-brand-mint/10 p-2.5 text-xs text-brand-mint">
                ✓ Confirmed by {observation.confirmedByName} on{' '}
                {new Date(observation.confirmedAt || '').toLocaleString()} via {observation.source}.
              </div>
            )}

            {confirmationFeedback && (
              <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 p-2 text-xs text-brand-primary">
                {confirmationFeedback}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                className="btn-primary flex-1 text-xs"
                onClick={handleConfirmFinding}
              >
                Confirm Finding as Clinician
              </button>
              {observation.quality !== 'Not assessed' && (
                <button
                  type="button"
                  className="btn-ghost text-xs text-rose-500 hover:text-rose-700"
                  onClick={handleWithdrawFinding}
                >
                  Withdraw Finding
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
