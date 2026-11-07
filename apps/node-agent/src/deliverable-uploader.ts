import { openAsBlob } from 'node:fs';
import { basename, join } from 'node:path';
import { AGENT_TOKEN_HEADER, type DeliverableSpec, type RunReport } from '@smart-team/shared';
import { filesMatching } from './stage-files.js';

const TRIES = 3;

/**
 * Sends a finished stage's files (renders, style frames, comparison sheets) to the hub for the Review Booth.
 * Stages read each other's files on this PC, so a failed upload never fails the stage: it is only reported.
 */
export class DeliverableUploader {
  constructor(
    private readonly hubUrl: string,
    private readonly token: string,
    private readonly deviceId: () => string | null,
  ) {}

  async upload(runId: string, taskDir: string, specs: DeliverableSpec[], onNote: (text: string) => void, signal?: AbortSignal): Promise<Pick<RunReport, 'uploaded' | 'uploadErrors'>> {
    const uploaded: RunReport['uploaded'] = [];
    const uploadErrors: string[] = [];
    const device = this.deviceId();
    if (!device) return { uploaded, uploadErrors: ['This PC has no hub id yet; files were not uploaded.'] };

    for (const spec of specs) {
      for (const path of filesMatching(taskDir, spec.glob, spec.maxFiles ?? 10)) {
        if (signal?.aborted) return { uploaded, uploadErrors: [...uploadErrors, 'Upload stopped: the run was cancelled.'] };
        const result = await this.send(runId, device, taskDir, path, spec.label, signal);
        if ('id' in result) uploaded.push({ id: result.id, path });
        else uploadErrors.push(`${path}: ${result.error}`);
      }
    }
    if (uploaded.length) onNote(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'} for the Review Booth.`);
    for (const e of uploadErrors) onNote(`Could not upload ${e}`);
    return { uploaded, uploadErrors };
  }

  private async send(runId: string, device: string, taskDir: string, path: string, label: string | undefined, signal?: AbortSignal): Promise<{ id: string } | { error: string }> {
    const url = new URL(`/api/runs/${runId}/deliverables`, this.hubUrl);
    let lastError = 'unknown error';
    for (let attempt = 1; attempt <= TRIES; attempt++) {
      try {
        const form = new FormData();
        form.append('path', path);
        if (label) form.append('label', label);
        form.append('file', await openAsBlob(join(taskDir, ...path.split('/'))), basename(path));
        const res = await fetch(url, { method: 'POST', headers: { [AGENT_TOKEN_HEADER]: this.token, 'x-device-id': device }, body: form, ...(signal ? { signal } : {}) });
        if (res.ok) return { id: ((await res.json()) as { id: string }).id };
        lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
        // The hub said no (not this stage's file, too big, run over): trying again will not help.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) return { error: lastError };
      } catch (error) {
        if (signal?.aborted) return { error: 'cancelled' };
        lastError = (error as Error).message;
      }
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
    return { error: lastError };
  }
}
