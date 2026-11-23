import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_FILE = path.join(DATA_DIR, 'author-auth.json');
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_ACTIVE_TOKENS = 200;

interface StoredAuthorHash {
  salt: string;
  hash: string;
  claimedAt: string;
}

const activeTokens = new Map<string, number>();

function getEnvSecret(): string | null {
  const val = process.env.AUTHOR_DISPATCH_SECRET?.trim();
  return val && val.length >= 6 ? val : null;
}

function readClaimedHash(): StoredAuthorHash | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) as Partial<StoredAuthorHash>;
    if (typeof raw.salt === 'string' && typeof raw.hash === 'string') {
      return {
        salt: raw.salt,
        hash: raw.hash,
        claimedAt: typeof raw.claimedAt === 'string' ? raw.claimedAt : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function issueToken(): string {
  const now = Date.now();
  if (activeTokens.size >= MAX_ACTIVE_TOKENS) {
    for (const [tok, exp] of activeTokens.entries()) {
      if (exp <= now || activeTokens.size >= MAX_ACTIVE_TOKENS) {
        activeTokens.delete(tok);
      }
    }
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.set(token, now + TOKEN_TTL_MS);
  return token;
}

export function getAuthorAuthStatus(): { mode: 'env' | 'claimed' | 'unclaimed' } {
  if (getEnvSecret()) return { mode: 'env' };
  if (readClaimedHash()) return { mode: 'claimed' };
  return { mode: 'unclaimed' };
}

export function claimAuthorPasscode(passcode: string):
  | { ok: true; token: string }
  | { ok: false; status: number; error: string } {
  if (getEnvSecret()) {
    return {
      ok: false,
      status: 409,
      error: 'Author passcode is already configured via server environment variables.',
    };
  }
  if (readClaimedHash()) {
    return {
      ok: false,
      status: 409,
      error: 'Author passcode has already been claimed. Enter your existing passcode to sign in.',
    };
  }
  const trimmed = passcode.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return {
      ok: false,
      status: 400,
      error: 'Choose an author passcode between 8 and 128 characters.',
    };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(trimmed, salt, 64).toString('hex');
  const record: StoredAuthorHash = {
    salt,
    hash,
    claimedAt: new Date().toISOString(),
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${AUTH_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, AUTH_FILE);
  } catch {
    return {
      ok: false,
      status: 500,
      error: 'Unable to save author credentials on this server. Set AUTHOR_DISPATCH_SECRET in environment secrets instead.',
    };
  }

  return { ok: true, token: issueToken() };
}

export function verifyAuthorPasscode(passcode: string):
  | { ok: true; token: string }
  | { ok: false; status: number; error: string } {
  const trimmed = passcode.trim();
  if (!trimmed || trimmed.length > 128) {
    return { ok: false, status: 400, error: 'Enter your author passcode.' };
  }

  const envSecret = getEnvSecret();
  if (envSecret) {
    if (!timingSafeStringEqual(trimmed, envSecret)) {
      return { ok: false, status: 401, error: 'Incorrect author passcode.' };
    }
    return { ok: true, token: issueToken() };
  }

  const stored = readClaimedHash();
  if (!stored) {
    return {
      ok: false,
      status: 400,
      error: 'No author passcode has been set yet. Create one first to enable publishing.',
    };
  }

  const candidate = crypto.scryptSync(trimmed, stored.salt, 64);
  const expected = Buffer.from(stored.hash, 'hex');
  if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) {
    return { ok: false, status: 401, error: 'Incorrect author passcode.' };
  }

  return { ok: true, token: issueToken() };
}

export function verifyAuthorBearerHeader(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;
  const exp = activeTokens.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    activeTokens.delete(token);
    return false;
  }
  return true;
}
