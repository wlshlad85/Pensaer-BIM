'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  detectPlatform,
  WSL2_CHECK_COMMAND,
  OS_LABELS,
  INSTALLER_LABELS,
  type PlatformInfo,
} from '@/lib/os-detect';

function StatusIcon({ status }: { status: 'ok' | 'warn' | 'error' | 'unknown' }) {
  const map = { ok: '✅', warn: '⚠️', error: '❌', unknown: '❓' } as const;
  return <span role="img" aria-label={status}>{map[status]}</span>;
}

export default function PlatformCheck() {
  const [info, setInfo] = useState<PlatformInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [wslInput, setWslInput] = useState('');

  useEffect(() => {
    setInfo(detectPlatform());
  }, []);

  const copyCommand = useCallback(async () => {
    await navigator.clipboard.writeText(WSL2_CHECK_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleWslResult = useCallback(
    (raw: string) => {
      if (!info) return;
      const trimmed = raw.trim().toUpperCase();
      setInfo({
        ...info,
        hasWSL2: trimmed.includes('WSL2_OK'),
        warnings: trimmed.includes('WSL2_OK')
          ? info.warnings.filter((w) => !w.includes('WSL2'))
          : [...info.warnings.filter((w) => !w.includes('WSL2')), 'WSL2 was not detected. Install it for the best experience.'],
      });
    },
    [info],
  );

  if (!info) return null;

  const osStatus = info.os === 'unknown' ? 'error' : 'ok';
  const wslStatus =
    info.os !== 'windows' ? null : info.hasWSL2 === null ? 'unknown' : info.hasWSL2 ? 'ok' : 'warn';
  const nodeStatus = info.nodeVersion ? 'ok' : 'unknown';

  return (
    <div className="space-y-4 rounded-lg border p-4 text-sm">
      <h3 className="text-base font-semibold">Platform Check</h3>

      {/* OS */}
      <div className="flex items-center gap-2">
        <StatusIcon status={osStatus} />
        <span>
          <strong>OS:</strong> {OS_LABELS[info.os]}
          {info.arch !== 'unknown' && ` (${info.arch})`}
        </span>
      </div>

      {/* Installer */}
      <div className="flex items-center gap-2">
        <StatusIcon status="ok" />
        <span>
          <strong>Recommended installer:</strong> {INSTALLER_LABELS[info.recommendedInstaller]}
        </span>
      </div>

      {/* Node */}
      <div className="flex items-center gap-2">
        <StatusIcon status={nodeStatus} />
        <span>
          <strong>Node.js:</strong> {info.nodeVersion ?? 'not checked yet'}
        </span>
      </div>

      {/* WSL2 (Windows only) */}
      {info.os === 'windows' && (
        <div className="space-y-2 rounded border p-3">
          <div className="flex items-center gap-2">
            <StatusIcon status={wslStatus!} />
            <strong>WSL2:</strong>{' '}
            {info.hasWSL2 === null ? 'not checked' : info.hasWSL2 ? 'detected' : 'not found'}
          </div>

          <p className="text-muted-foreground text-xs">
            Run this in PowerShell, then paste the output below:
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded px-2 py-1 text-xs">
              {WSL2_CHECK_COMMAND}
            </code>
            <button
              onClick={copyCommand}
              className="rounded border px-2 py-1 text-xs hover:bg-accent"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste output here…"
              value={wslInput}
              onChange={(e) => setWslInput(e.target.value)}
              className="bg-muted flex-1 rounded border px-2 py-1 text-xs"
            />
            <button
              onClick={() => handleWslResult(wslInput)}
              className="rounded border px-2 py-1 text-xs hover:bg-accent"
            >
              Check
            </button>
          </div>
        </div>
      )}

      {/* Warnings */}
      {info.warnings.length > 0 && (
        <div className="space-y-1">
          {info.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400">
              <StatusIcon status="warn" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
