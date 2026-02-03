// os-detect.ts — Browser-side OS/platform detection for Clawhatch wizard

export type OSType = 'windows' | 'macos' | 'linux' | 'unknown';
export type Arch = 'x64' | 'arm64' | 'unknown';
export type Installer = 'npm' | 'pnpm' | 'homebrew';

export interface PlatformInfo {
  os: OSType;
  arch: Arch;
  hasWSL2: boolean | null;
  recommendedInstaller: Installer;
  nodeVersion: string | null;
  warnings: string[];
}

/** PowerShell one-liner to check for WSL2 — user copy-pastes into terminal */
export const WSL2_CHECK_COMMAND =
  `powershell -Command "if (Get-Command wsl -ErrorAction SilentlyContinue) { $v = wsl --list --verbose 2>&1; if ($v -match 'VERSION.*2|\\s2\\s') { Write-Output 'WSL2_OK' } else { Write-Output 'WSL2_MISSING' } } else { Write-Output 'WSL_NOT_INSTALLED' }"`;

function detectOS(ua: string): OSType {
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac\s?OS|Macintosh/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

function detectArch(ua: string): Arch {
  if (/arm64|aarch64/i.test(ua)) return 'arm64';
  if (/x86_64|x64|amd64|Win64|WOW64/i.test(ua)) return 'x64';
  return 'unknown';
}

function getRecommendedInstaller(os: OSType): Installer {
  switch (os) {
    case 'macos':
      return 'homebrew';
    case 'windows':
    case 'linux':
    default:
      return 'npm';
  }
}

function buildWarnings(os: OSType, arch: Arch): string[] {
  const warnings: string[] = [];

  if (os === 'unknown') {
    warnings.push('Could not detect your operating system. Manual setup may be required.');
  }
  if (os === 'windows') {
    warnings.push('WSL2 is recommended for the best experience on Windows.');
  }
  if (arch === 'arm64' && os === 'linux') {
    warnings.push('ARM64 Linux detected — some native modules may need compilation.');
  }
  return warnings;
}

/**
 * Detect platform info from the browser userAgent.
 * Call client-side only (needs `navigator`).
 */
export function detectPlatform(userAgent?: string): PlatformInfo {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const os = detectOS(ua);
  const arch = detectArch(ua);

  return {
    os,
    arch,
    hasWSL2: null, // unknown until user runs the check command
    recommendedInstaller: getRecommendedInstaller(os),
    nodeVersion: null, // populated later if user runs a check
    warnings: buildWarnings(os, arch),
  };
}

/** Labels for display */
export const OS_LABELS: Record<OSType, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  unknown: 'Unknown OS',
};

export const INSTALLER_LABELS: Record<Installer, string> = {
  npm: 'npm',
  pnpm: 'pnpm',
  homebrew: 'Homebrew',
};
