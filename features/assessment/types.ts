/** Proposed integration contracts only. Not connected to the UI, storage or DJI SDK. */
export type AssessmentChannelKind =
  | 'camera' | 'caregiver-audio' | 'instrument' | 'human-examination';

export type AssessmentChannelState =
  | 'unverified' | 'unavailable' | 'simulated' | 'connected' | 'disconnected';

export interface AssessmentChannel {
  id: string;
  kind: AssessmentChannelKind;
  state: AssessmentChannelState;
  origin: 'aircraft' | 'ground-device' | 'trained-person' | 'simulator';
  deviceId: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  limitations: string[];
}

export interface AssessmentSession {
  id: string;
  encounterId: string;
  aircraftId: string | null;
  mode: 'simulation' | 'stationary-hardware-test' | 'authorized-field-test';
  status: 'planned' | 'active' | 'interrupted' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;
  channels: AssessmentChannel[];
  evidenceIds: string[];
}

export interface AssessmentEvidence {
  id: string;
  sessionId: string;
  encounterId: string;
  subject: 'mother' | 'infant';
  subjectId: string;
  observationDefinitionId: string;
  channelId: string;
  capturedAt: string;
  capturedBy: string;
  kind: 'image' | 'audio' | 'video' | 'measurement' | 'human-record';
  reference: string;
  quality: 'pending-review' | 'usable' | 'unusable';
  reviewedBy: string | null;
  reviewedAt: string | null;
  simulated: boolean;
}
