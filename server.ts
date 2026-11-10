// server.ts
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import {
  AiNotConfiguredError,
  AiProviderError,
  buildServerFallbackDraft,
  buildServerLiveDraft,
  isServerAiConfigured,
  type ScrubbedDraftRequest,
} from './server/aiDraftServer';
import { DecisionInput, validateDecision } from './services/clinicalWorkflow';
import { Encounter, UserAccount, UserRole } from './types';
import type { DecisionValidation } from './services/clinicalWorkflow';

const PORT = Number(process.env.PORT ?? 4001);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

interface ServerSession {
  userId: string;
  role: UserRole;
  facilityId: string | null;
}

const parseSession = (req: Request): ServerSession | null => {
  const userId = req.header('X-User-Id');
  const role = req.header('X-User-Role');
  const facilityHeader = req.header('X-Facility-Id');
  if (!userId || !role) return null;
  if (!['Physician', 'Field Officer', 'Program Admin'].includes(role)) return null;
  return {
    userId,
    role: role as UserRole,
    facilityId: facilityHeader && facilityHeader !== 'none' ? facilityHeader : null,
  };
};

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: isServerAiConfigured(),
    model: isServerAiConfigured() ? 'gemini-2.5-flash' : null,
    time: new Date().toISOString(),
  });
});

app.post('/api/clinical/ai-draft', async (req: Request, res: Response) => {
  const session = parseSession(req);
  if (!session) return res.status(401).json({ error: 'Missing or invalid user claims.' });

  const payload = req.body as ScrubbedDraftRequest;
  if (!payload?.encounter || !payload?.patient || !payload?.language) {
    return res.status(400).json({ error: 'Invalid draft request payload.' });
  }

  try {
    const draft = await buildServerLiveDraft(payload);
    return res.json({ draft, simulated: false, model: draft.model, source: 'server-live' });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return res.status(503).json({
        error: 'AI provider not configured on server',
        fallbackRecommended: true,
      });
    }
    if (error instanceof AiProviderError) {
      const fallback = buildServerFallbackDraft(payload, error.message);
      return res.status(503).json({
        error: error.message,
        fallbackRecommended: true,
        draft: fallback,
        simulated: true,
        model: fallback.model,
        source: 'server-fallback',
      });
    }
    // eslint-disable-next-line no-console
    console.error('[server] Unexpected AI draft error', error);
    return res.status(500).json({ error: 'Internal error preparing draft.' });
  }
});

app.post('/api/clinical/sign-decision', (req: Request, res: Response) => {
  const session = parseSession(req);
  if (!session) {
    return res.status(401).json({
      valid: false,
      errors: ['Missing or invalid user claims.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }
  if (session.role !== 'Physician') {
    return res.status(403).json({
      valid: false,
      errors: ['Only a physician account can sign a decision.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  const { encounter, decision } = req.body as {
    encounter: Pick<Encounter, 'id' | 'facilityId' | 'status' | 'deliveryState' | 'observations'>;
    decision: DecisionInput;
  };

  if (!encounter || !decision) {
    return res.status(400).json({
      valid: false,
      errors: ['Invalid signing request.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  if (session.facilityId !== encounter.facilityId) {
    return res.status(403).json({
      valid: false,
      errors: ['The signing physician must belong to the encounter facility.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  const fauxEncounter = {
    ...encounter,
    observations: encounter.observations.map((o) => ({
      definitionId: o.definitionId,
      value: o.value,
      quality: o.quality,
      recordedAt: null,
      recordedBy: null,
    })),
  } as unknown as Encounter;

  const validation = validateDecision(fauxEncounter, decision);
  return res.status(validation.valid ? 200 : 422).json(validation);
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[server] Unhandled error', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] NdaY'Radoko backend listening on http://localhost:${PORT} (AI: ${isServerAiConfigured() ? 'configured' : 'fallback only'})`,
  );
});

export type { UserAccount };
