import { randomBytes } from 'node:crypto';

const challenges = new Map();
const lifetimeMs = 5 * 60_000;

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [id, challenge] of challenges) {
    if (now - challenge.createdAt > lifetimeMs) challenges.delete(id);
  }
}

function safeTelegramUser(user = {}) {
  return {
    id: String(user.id || ''),
    first_name: String(user.first_name || '').slice(0, 80),
    last_name: String(user.last_name || '').slice(0, 80),
    username: String(user.username || '').slice(0, 64),
    photo_url: '',
  };
}

export function createLoginChallenge() {
  cleanExpiredChallenges();
  const id = randomBytes(24).toString('hex');
  challenges.set(id, { createdAt: Date.now(), user: null });
  return { id, expiresIn: lifetimeMs / 1000 };
}

export function approveLoginChallenge(id, telegramUser) {
  cleanExpiredChallenges();
  const challenge = challenges.get(id);
  if (!challenge || challenge.user) return false;
  challenge.user = safeTelegramUser(telegramUser);
  return Boolean(challenge.user.id);
}

export function consumeLoginChallenge(id) {
  cleanExpiredChallenges();
  const challenge = challenges.get(id);
  if (!challenge) return { status: 'expired' };
  if (!challenge.user) return { status: 'pending' };
  challenges.delete(id);
  return { status: 'approved', user: challenge.user };
}
