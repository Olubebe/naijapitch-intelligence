
import crypto from 'node:crypto';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const googleCloudApiKey =
  process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'NaijaPitch Intelligence <no-reply@naijapitch.local>';

if (!databaseUrl) {
  throw new Error('NEON_DATABASE_URL or DATABASE_URL must be configured');
}

const sql = neon(databaseUrl);

type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_APPROVAL' | 'REJECTED';
type LinkAudience = 'ANY' | 'AUTHENTICATED' | 'ANONYMOUS';

const CLUB_REVIEW_HOURS = Number(process.env.CLUB_REVIEW_HOURS || 72);
const DEFAULT_LINK_EXPIRY_HOURS = Number(process.env.DEFAULT_LINK_EXPIRY_HOURS || 48);
const MIN_FEEDBACK_LENGTH = Number(process.env.MIN_FEEDBACK_LENGTH || 12);
const MAX_FEEDBACK_LENGTH = Number(process.env.MAX_FEEDBACK_LENGTH || 2000);
const SUPER_ADMIN_EMAILS = new Set(
  (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

function applyRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

function rateLimit(options: {
  namespace: string;
  limit: number;
  windowMs: number;
  keyResolver?: (req: express.Request) => string | null;
}) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const keyPart =
      options.keyResolver?.(req) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const result = applyRateLimit(
      `${options.namespace}:${keyPart}`,
      options.limit,
      options.windowMs
    );

    res.setHeader('X-RateLimit-Limit', String(options.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('Retry-After', String(result.retryAfterSeconds));

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
  };
}

function normalizeClubSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeClubName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sanitizeText(value: unknown, maxLength = 255) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function sanitizeOptionalUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (value.startsWith('data:image/')) {
    return value.length <= 2_000_000 ? value : null;
  }
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikeGibberish(text: string) {
  if (text.length < MIN_FEEDBACK_LENGTH) return true;
  if (/^[^a-zA-Z0-9]+$/.test(text)) return true;
  if (/(.)\1{6,}/.test(text)) return true;
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildClubAliases(club: { id: string; name: string }) {
  const aliases = new Set<string>();
  const normalizedName = normalizeSearchText(club.name || '');
  const slugName = normalizeSearchText(String(club.id || '').replace(/-/g, ' '));
  const withoutSuffix = normalizedName
    .replace(/\b(fc|cf|sc|afc|club)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  [normalizedName, slugName, withoutSuffix].forEach((alias) => {
    if (alias && alias.length >= 3) aliases.add(alias);
  });

  return Array.from(aliases);
}

async function listClubReferences() {
  const clubs = await sql`SELECT id, name FROM clubs`;
  return clubs.map((club: any) => ({
    id: String(club.id),
    name: String(club.name),
    aliases: buildClubAliases({ id: String(club.id), name: String(club.name) }),
  }));
}

function detectClubFeedbackContext(
  text: string,
  clubs: Array<{ id: string; name: string; aliases: string[] }>,
  ownerClubId: string
) {
  const normalizedText = normalizeSearchText(text);
  const matches = clubs
    .map((club) => {
      const score = club.aliases.reduce((sum, alias) => {
        const regex = new RegExp(`\\b${escapeRegex(alias).replace(/\s+/g, '\\s+')}\\b`, 'g');
        return sum + (normalizedText.match(regex)?.length || 0);
      }, 0);
      return {
        id: club.id,
        name: club.name,
        score,
      };
    })
    .filter((club) => club.score > 0)
    .sort((a, b) => b.score - a.score);

  const ownerClub = clubs.find((club) => club.id === ownerClubId) || null;
  const topMatch = matches[0] || null;
  const primarySubjectClub = topMatch?.id || ownerClubId || null;
  const mentionedClubs = matches.map((club) => club.id);
  const isCrossClubFeedback = Boolean(
    topMatch && topMatch.id !== ownerClubId
  );

  return {
    ownerClubId,
    ownerClubName: ownerClub?.name || ownerClubId,
    primarySubjectClub,
    primarySubjectClubName:
      clubs.find((club) => club.id === primarySubjectClub)?.name || ownerClub?.name || null,
    mentionedClubs,
    mentionedClubNames: matches.map((club) => club.name),
    isCrossClubFeedback,
  };
}

function inferFeedbackCategory(lowerText: string) {
  if (
    lowerText.includes('transfer') ||
    lowerText.includes('signing') ||
    lowerText.includes('bid') ||
    lowerText.includes('contract') ||
    lowerText.includes('loan')
  ) {
    return 'Transfers';
  }

  if (
    lowerText.includes('player') ||
    lowerText.includes('striker') ||
    lowerText.includes('defender') ||
    lowerText.includes('midfielder') ||
    lowerText.includes('goalkeeper')
  ) {
    return 'Players';
  }

  return 'Match';
}

const TOPIC_SUBHEADINGS: Record<string, string[]> = {
  match: ['Coaching', 'Officiating', 'Facilities', 'Supporter Experience', 'Club Management'],
  players: ['Player Welfare', 'Medical & Fitness', 'Youth Development', 'Coaching', 'Club Management'],
  transfer: ['Scouting & Recruitment', 'Squad Planning', 'Contract Decisions', 'Player Welfare', 'Club Management'],
};

function normalizeTopicType(value: unknown) {
  const sanitized = sanitizeText(value, 40).toLowerCase();
  return ['match', 'transfer', 'players'].includes(sanitized) ? sanitized : 'match';
}

function normalizeSubheadingForTopic(topicType: string, value: unknown) {
  const allowed = TOPIC_SUBHEADINGS[topicType] || TOPIC_SUBHEADINGS.match;
  const subheading = sanitizeText(value, 120);
  return allowed.includes(subheading) ? subheading : allowed[0];
}

function inferFootballRelevance(lowerText: string) {
  const footballKeywords = [
    'football',
    'soccer',
    'club',
    'match',
    'fixture',
    'stadium',
    'supporter',
    'fans',
    'coach',
    'manager',
    'player',
    'transfer',
    'goal',
    'league',
    'referee',
    'tactics',
    'academy',
    'defender',
    'striker',
    'midfielder',
    'goalkeeper',
  ];

  return footballKeywords.some((keyword) => lowerText.includes(keyword));
}

function computeCredibilityScore(options: {
  text: string;
  isFootballRelated: boolean;
  qualityFlags: string[];
  entityCount: number;
  sentimentMagnitude: number;
}) {
  let score = 0.45;

  if (options.isFootballRelated) score += 0.15;
  if (options.text.length >= 120) score += 0.1;
  if (options.text.length >= 300) score += 0.05;
  if (options.entityCount >= 2) score += 0.1;
  if (options.sentimentMagnitude >= 0.2) score += 0.05;

  score -= options.qualityFlags.length * 0.12;

  return clamp(score, 0.05, 0.95);
}

function getSentimentSummary(score: number, magnitude: number) {
  if (score >= 0.35) {
    return `The tone of the submission is clearly positive. It reads as supportive or optimistic, with a sentiment score of ${score.toFixed(2)} and an intensity level of ${magnitude.toFixed(2)}.`;
  }

  if (score <= -0.35) {
    return `The tone of the submission is clearly negative. It reads as critical or dissatisfied, with a sentiment score of ${score.toFixed(2)} and an intensity level of ${magnitude.toFixed(2)}.`;
  }

  return `The tone of the submission is mixed or neutral. It contains balanced or unclear sentiment, with a score of ${score.toFixed(2)} and an intensity level of ${magnitude.toFixed(2)}.`;
}

function getCredibilitySummary(score: number) {
  if (score >= 0.8) {
    return `This looks highly credible (${(score * 100).toFixed(0)}%). The feedback is specific, relevant to football, and detailed enough to support decision-making without immediate doubts about quality.`;
  }

  if (score >= 0.55) {
    return `This looks moderately credible (${(score * 100).toFixed(0)}%). The feedback contains useful context, but some claims or interpretations may still need human review before action is taken.`;
  }

  return `This looks low credibility (${(score * 100).toFixed(0)}%). The feedback lacks enough detail, clarity, or football-specific grounding to rely on it confidently without manual review.`;
}

function getRiskSummary(flags: string[], credibilityScore: number) {
  if (flags.length > 0) {
    return `Validation flagged these review signals: ${flags.join(', ')}.`;
  }

  if (credibilityScore < 0.45) {
    return 'This submission needs manual review because the supporting detail is still weak.';
  }

  return 'No immediate moderation risks were detected in this submission.';
}

function buildDetailedJustification(options: {
  detectedLanguage: string;
  category: string;
  isFootballRelated: boolean;
  sentimentScore: number;
  magnitude: number;
  credibilityScore: number;
  qualityFlags: string[];
  entities: Array<{ name: string; type: string; sentimentScore: number }>;
}) {
  const entitySummary = options.entities.length
    ? options.entities
        .slice(0, 5)
        .map((entity) => `${entity.name} (${entity.type.toLowerCase()})`)
        .join(', ')
    : 'No strong named entities were confidently extracted from the text.';

  const relevanceSummary = options.isFootballRelated
    ? 'The submission is clearly about football and fits the platform context.'
    : 'The submission does not strongly match football-specific language and should be reviewed manually before it is treated as valid football feedback.';

  const qualitySummary = options.qualityFlags.length
    ? `Validation flags raised: ${options.qualityFlags.join(', ')}.`
    : 'No quality flags were raised during validation.';

  return [
    'Executive Summary',
    `This feedback was analyzed with Cloud Translation and Cloud Natural Language. It was detected as ${options.detectedLanguage} and classified under ${options.category}. ${relevanceSummary}`,
    '',
    'Sentiment Assessment',
    getSentimentSummary(options.sentimentScore, options.magnitude),
    '',
    'Credibility Assessment',
    getCredibilitySummary(options.credibilityScore),
    '',
    'Key Football References',
    entitySummary,
    '',
    'Moderation Note',
    getRiskSummary(options.qualityFlags, options.credibilityScore),
    qualitySummary,
  ].join('\n');
}

function getSentimentBand(score: number) {
  if (score >= 0.2) return 'positive';
  if (score <= -0.2) return 'negative';
  return 'neutral';
}

function buildFeedbackHighlights(rows: any[]) {
  const concerns = [...rows]
    .filter((row) => Number(row.sentiment_score || 0) <= -0.2)
    .sort((a, b) => Number(a.sentiment_score || 0) - Number(b.sentiment_score || 0))
    .slice(0, 2)
    .map((row) => sanitizeText(row.translated_text || row.original_text, 220));

  const positives = [...rows]
    .filter((row) => Number(row.sentiment_score || 0) >= 0.2)
    .sort((a, b) => Number(b.sentiment_score || 0) - Number(a.sentiment_score || 0))
    .slice(0, 2)
    .map((row) => sanitizeText(row.translated_text || row.original_text, 220));

  return { concerns, positives };
}

function buildLinkDigest(match: any, rows: any[]) {
  const total = rows.length;
  const avgSentiment = total
    ? rows.reduce((sum, row) => sum + Number(row.sentiment_score || 0), 0) / total
    : 0;
  const avgCredibility = total
    ? rows.reduce((sum, row) => sum + Number(row.credibility_score || 0), 0) / total
    : 0;
  const flaggedCount = rows.filter((row) => row.validation_status === 'FLAGGED').length;
  const anonymousCount = rows.filter((row) => row.is_anonymous).length;
  const authenticatedCount = total - anonymousCount;

  const sentimentMix = {
    positive: rows.filter((row) => getSentimentBand(Number(row.sentiment_score || 0)) === 'positive').length,
    neutral: rows.filter((row) => getSentimentBand(Number(row.sentiment_score || 0)) === 'neutral').length,
    negative: rows.filter((row) => getSentimentBand(Number(row.sentiment_score || 0)) === 'negative').length,
  };

  const entityCounts = new Map<string, number>();
  for (const row of rows) {
    const entities = Array.isArray(row.entities)
      ? row.entities
      : (() => {
          try {
            return JSON.parse(row.entities || '[]');
          } catch {
            return [];
          }
        })();

    for (const entity of entities) {
      const name = sanitizeText(entity?.name, 80);
      if (!name) continue;
      entityCounts.set(name, (entityCounts.get(name) || 0) + 1);
    }
  }

  const topEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const strongestFocusAreas = Array.from(
    rows.reduce((acc, row) => {
      const key = sanitizeText(row.subheading || match.subheading || 'General', 80);
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));

  const highlights = buildFeedbackHighlights(rows);
  const summaryParagraph = total === 0
    ? `No feedback has been collected yet for the shareable link covering ${match.opponent}.`
    : `${total} feedback submission(s) were collected for ${match.opponent}. Overall sentiment is ${getSentimentBand(avgSentiment)} (${avgSentiment.toFixed(2)}), average credibility is ${(avgCredibility * 100).toFixed(0)}%, and ${flaggedCount} submission(s) need extra human review.`;

  const subjectLine = `Feedback Digest: ${match.club_name} - ${match.opponent}`;
  const textBody = [
    subjectLine,
    '',
    summaryParagraph,
    '',
    `Topic: ${match.topic_type || 'match'}`,
    `Focus area: ${match.subheading || 'General'}`,
    `Audience split: ${anonymousCount} anonymous / ${authenticatedCount} authenticated`,
    `Sentiment mix: ${sentimentMix.positive} positive, ${sentimentMix.neutral} neutral, ${sentimentMix.negative} negative`,
    strongestFocusAreas.length
      ? `Most common focus areas: ${strongestFocusAreas.map((item) => `${item.name} (${item.count})`).join(', ')}`
      : 'Most common focus areas: none yet',
    topEntities.length
      ? `Most mentioned entities: ${topEntities.map((item) => `${item.name} (${item.count})`).join(', ')}`
      : 'Most mentioned entities: none',
    highlights.concerns.length
      ? `Key concerns: ${highlights.concerns.join(' | ')}`
      : 'Key concerns: none strongly negative yet',
    highlights.positives.length
      ? `Positive signals: ${highlights.positives.join(' | ')}`
      : 'Positive signals: none strongly positive yet',
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2>${subjectLine}</h2>
      <p>${summaryParagraph}</p>
      <p><strong>Topic:</strong> ${match.topic_type || 'match'}<br/>
      <strong>Focus area:</strong> ${match.subheading || 'General'}<br/>
      <strong>Audience split:</strong> ${anonymousCount} anonymous / ${authenticatedCount} authenticated<br/>
      <strong>Sentiment mix:</strong> ${sentimentMix.positive} positive, ${sentimentMix.neutral} neutral, ${sentimentMix.negative} negative</p>
      <p><strong>Most common focus areas:</strong> ${strongestFocusAreas.length ? strongestFocusAreas.map((item) => `${item.name} (${item.count})`).join(', ') : 'None yet'}</p>
      <p><strong>Most mentioned entities:</strong> ${topEntities.length ? topEntities.map((item) => `${item.name} (${item.count})`).join(', ') : 'None yet'}</p>
      <p><strong>Key concerns:</strong> ${highlights.concerns.length ? highlights.concerns.join(' | ') : 'None strongly negative yet'}</p>
      <p><strong>Positive signals:</strong> ${highlights.positives.length ? highlights.positives.join(' | ') : 'None strongly positive yet'}</p>
    </div>
  `;

  return {
    subjectLine,
    summaryParagraph,
    stats: {
      total,
      avgSentiment: Number(avgSentiment.toFixed(2)),
      avgCredibility: Number(avgCredibility.toFixed(2)),
      flaggedCount,
      anonymousCount,
      authenticatedCount,
      sentimentMix,
    },
    topEntities,
    strongestFocusAreas,
    highlights,
    textBody,
    htmlBody,
  };
}

async function sendDigestEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resendApiKey) {
    return { sent: false, reason: 'RESEND_API_KEY is not configured.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Email send failed (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  return { sent: true, id: payload.id as string | undefined };
}

async function postGoogleCloudJson<T>(url: string, body: Record<string, unknown>) {
  if (!googleCloudApiKey) {
    throw new Error('GOOGLE_CLOUD_API_KEY is not configured.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Goog-Api-Key': googleCloudApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Google Cloud request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

async function translateFeedbackText(text: string) {
  type TranslationResponse = {
    data?: {
      translations?: Array<{
        translatedText?: string;
        detectedSourceLanguage?: string;
      }>;
    };
  };

  const response = await postGoogleCloudJson<TranslationResponse>(
    'https://translation.googleapis.com/language/translate/v2',
    {
      q: text,
      target: 'en',
      format: 'text',
    }
  );

  const translation = response.data?.translations?.[0];

  return {
    translatedText: decodeHtmlEntities(translation?.translatedText || text),
    detectedLanguage: translation?.detectedSourceLanguage || 'und',
  };
}

async function analyzeNaturalLanguageText(text: string, languageCode?: string) {
  type SentimentResponse = {
    documentSentiment?: {
      score?: number;
      magnitude?: number;
    };
    language?: string;
  };

  type EntitiesResponse = {
    entities?: Array<{
      name?: string;
      type?: string;
      salience?: number;
    }>;
    language?: string;
  };

  const document: Record<string, unknown> = {
    type: 'PLAIN_TEXT',
    content: text,
  };

  if (languageCode && languageCode !== 'und') {
    document.language = languageCode;
  }

  const [sentimentResponse, entitiesResponse] = await Promise.all([
    postGoogleCloudJson<SentimentResponse>(
      'https://language.googleapis.com/v1/documents:analyzeSentiment',
      {
        document,
        encodingType: 'UTF8',
      }
    ),
    postGoogleCloudJson<EntitiesResponse>(
      'https://language.googleapis.com/v1/documents:analyzeEntities',
      {
        document,
        encodingType: 'UTF8',
      }
    ),
  ]);

  return {
    language: sentimentResponse.language || entitiesResponse.language || languageCode || 'und',
    sentimentScore: Number(sentimentResponse.documentSentiment?.score || 0),
    magnitude: Number(sentimentResponse.documentSentiment?.magnitude || 0),
    entities: (entitiesResponse.entities || [])
      .filter((entity) => entity.name)
      .filter((entity) => {
        const name = sanitizeText(entity.name, 120);
        const type = sanitizeText(entity.type || 'UNKNOWN', 40);
        if (!name || name.length < 3) return false;
        if (/^\d+$/.test(name)) return false;
        if (/^(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(name)) return false;
        if (['OTHER', 'NUMBER', 'PRICE'].includes(type)) return false;
        return Number(entity.salience || 0) >= 0.02;
      })
      .slice(0, 8)
      .map((entity) => ({
        name: sanitizeText(entity.name, 120),
        type: sanitizeText(entity.type || 'UNKNOWN', 40),
        sentimentScore: clamp(Number(entity.salience || 0), 0, 1),
      })),
  };
}

function hashIp(ip: string | undefined) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function getTokenFromHeader(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

function getReviewDueAt() {
  return new Date(Date.now() + CLUB_REVIEW_HOURS * 60 * 60 * 1000);
}

function getLinkExpiry(hours?: number) {
  const safeHours = Math.max(1, Math.min(Number(hours || DEFAULT_LINK_EXPIRY_HOURS), 168));
  return new Date(Date.now() + safeHours * 60 * 60 * 1000);
}

function getAudience(value: unknown): LinkAudience {
  if (value === 'AUTHENTICATED' || value === 'ANONYMOUS') return value;
  return 'ANY';
}

async function getClubAdminInfoByEmail(email: string) {
  if (!email) return [];

  try {
    return await sql`
      SELECT id, status
      FROM clubs
      WHERE admin_email = ${email}
    `;
  } catch (error) {
    console.warn('Falling back to legacy club lookup during sync:', error);
    const fallback = await sql`
      SELECT id
      FROM clubs
      WHERE admin_email = ${email}
    `;
    return fallback.map((club: any) => ({ ...club, status: 'APPROVED' }));
  }
}

async function resolveGeneralFeedbackMatch(params: {
  matchId: string;
  subject?: string;
  topicType?: string;
  subheading?: string;
}) {
  if (params.matchId && params.matchId !== 'general-match') {
    return params.matchId;
  }

  const subject = sanitizeText(params.subject, 120);
  if (!subject) {
    throw new Error('A football subject is required for general feedback.');
  }

  const topicType = normalizeTopicType(params.topicType);
  const subheading = normalizeSubheadingForTopic(topicType, params.subheading);

  const publicClub = await sql`
    SELECT id
    FROM clubs
    WHERE id = 'super-eagles'
       OR COALESCE(status, 'APPROVED') = 'APPROVED'
    ORDER BY CASE WHEN id = 'super-eagles' THEN 0 ELSE 1 END, id
    LIMIT 1
  `;

  if (publicClub.length === 0) {
    throw new Error('No active club is configured to receive public feedback.');
  }

  const existing = await sql`
    SELECT id
    FROM matches
    WHERE club_id = ${publicClub[0].id}
      AND opponent = ${subject}
      AND COALESCE(topic_type, 'match') = ${topicType}
      AND COALESCE(subheading, '') = ${subheading}
      AND created_by = 'public-portal'
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await sql`
    INSERT INTO matches (
      id, club_id, opponent, sharable_id, topic_type, subheading, expires_at, created_by, audience
    )
    VALUES (
      ${id},
      ${publicClub[0].id},
      ${subject},
      NULL,
      ${topicType},
      ${subheading},
      NULL,
      'public-portal',
      'ANY'
    )
  `;

  return id;
}

// Auth Middleware
let JWKS_URL = process.env.NEON_JWKS_URL || process.env.JWKS_URL || process.env.VITE_JWKS_URL;

// Fallback for Neon Auth if only NEON_AUTH_URL is provided
if (!JWKS_URL && (process.env.NEON_AUTH_URL || process.env.VITE_NEON_AUTH_URL)) {
  const authUrl = process.env.NEON_AUTH_URL || process.env.VITE_NEON_AUTH_URL;
  JWKS_URL = `${authUrl}/.well-known/jwks.json`;
}

const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

console.log('Using JWKS_URL:', JWKS_URL);

async function verifyToken(token: string) {
  // 1. Try with pre-configured JWKS
  if (JWKS) {
    try {
      const { payload } = await jwtVerify(token, JWKS);
      return payload;
    } catch (jwksErr: any) {
      console.warn('Primary JWKS verification failed, trying dynamic fallback:', jwksErr.message);
    }
  }

  // 2. Dynamic Fallback: Extract issuer from token and fetch its JWKS
  const decoded = decodeJwt(token);
  if (decoded.iss) {
    const issuer = decoded.iss.endsWith('/') ? decoded.iss : `${decoded.iss}/`;
    const dynamicJwksUrl = `${issuer}.well-known/jwks.json`;
    
    console.log('Attempting dynamic JWKS fetch from issuer:', dynamicJwksUrl);
    const dynamicJWKS = createRemoteJWKSet(new URL(dynamicJwksUrl));
    const { payload } = await jwtVerify(token, dynamicJWKS);
    return payload;
  }

  throw new Error('JWKS not configured and no issuer found in token');
}

async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = await verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err: any) {
    console.error('Authentication failed:', err.message);
    if (err.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    res.status(401).json({ error: `Authentication failed: ${err.message}` });
  }
}

async function requireUserRecord(req: express.Request, res: express.Response) {
  const authUser = (req as any).user;
  const users = await sql`SELECT * FROM users WHERE id = ${authUser.sub}`;
  if (users.length === 0) {
    res.status(403).json({ error: 'User record not found. Please sign in again.' });
    return null;
  }
  return users[0];
}

async function requireRole(
  req: express.Request,
  res: express.Response,
  roles: UserRole[]
) {
  const userRecord = await requireUserRecord(req, res);
  if (!userRecord) return null;

  if (!roles.includes(userRecord.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  if (userRecord.status === 'BLOCKED') {
    res.status(403).json({ error: 'Your account has been blocked.' });
    return null;
  }

  if (userRecord.status === 'PENDING_APPROVAL' && !roles.includes('SUPER_ADMIN')) {
    res.status(403).json({ error: 'Your account is pending approval.' });
    return null;
  }

  return userRecord;
}

app.use(cors());
app.use(express.json({ limit: '4mb' }));

// Database Initialization
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS clubs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        normalized_name TEXT UNIQUE,
        npfl_id TEXT UNIQUE,
        logo_url TEXT,
        admin_email TEXT UNIQUE,
        status TEXT DEFAULT 'APPROVED',
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        review_due_at TIMESTAMP WITH TIME ZONE,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by TEXT,
        rejection_reason TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS npfl_id TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS admin_email TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS normalized_name TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED'`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS reviewed_by TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rejection_reason TEXT`;
    await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        club_id TEXT REFERENCES clubs(id),
        opponent TEXT NOT NULL,
        match_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sharable_id TEXT UNIQUE,
        topic_type TEXT DEFAULT 'match',
        subheading TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_by TEXT,
        audience TEXT DEFAULT 'ANY'
      )
    `;
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS topic_type TEXT DEFAULT 'match'`;
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS subheading TEXT`;
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_by TEXT`;
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'ANY'`;
    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        match_id TEXT REFERENCES matches(id),
        user_id TEXT, -- Null for anonymous
        original_text TEXT NOT NULL,
        translated_text TEXT,
        detected_language TEXT,
        sentiment_score FLOAT,
        magnitude FLOAT,
        category TEXT, -- Match, Players, Transfers
        credibility_score FLOAT,
        justification TEXT,
        entities JSONB,
        is_anonymous BOOLEAN DEFAULT TRUE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        validation_status TEXT DEFAULT 'APPROVED',
        quality_flags JSONB DEFAULT '[]'::jsonb,
        source_ip_hash TEXT,
        user_credibility_snapshot FLOAT,
        owner_club_id TEXT,
        primary_subject_club TEXT,
        mentioned_clubs JSONB DEFAULT '[]'::jsonb,
        is_cross_club_feedback BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'APPROVED'`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS quality_flags JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_ip_hash TEXT`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_credibility_snapshot FLOAT`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS owner_club_id TEXT`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS primary_subject_club TEXT`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS mentioned_clubs JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_cross_club_feedback BOOLEAN DEFAULT FALSE`;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        role TEXT DEFAULT 'USER', -- USER, ADMIN, or SUPER_ADMIN
        club_id TEXT REFERENCES clubs(id), -- For ADMINs
        credibility_score FLOAT DEFAULT 1.0,
        is_blocked BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'ACTIVE',
        approved_at TIMESTAMP WITH TIME ZONE,
        blocked_at TIMESTAMP WITH TIME ZONE,
        blocked_reason TEXT
      )
    `;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id TEXT REFERENCES clubs(id)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS credibility_score FLOAT DEFAULT 1.0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT`;

    await sql`
      UPDATE clubs
      SET normalized_name = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
      WHERE normalized_name IS NULL
    `;

    // Seed some clubs if empty
    const clubsCount = await sql`SELECT count(*) FROM clubs`;
    if (parseInt(clubsCount[0].count, 10) === 0) {
      await sql`INSERT INTO clubs (id, name, normalized_name, admin_email, npfl_id, status, is_active) VALUES 
        ('arsenal', 'Arsenal FC', 'arsenal fc', 'arsenal@example.com', 'NPFL-ARS-001', 'APPROVED', TRUE),
        ('chelsea', 'Chelsea FC', 'chelsea fc', 'chelsea@example.com', 'NPFL-CHE-002', 'APPROVED', TRUE),
        ('enyimba', 'Enyimba FC', 'enyimba fc', 'enyimba@example.com', 'NPFL-ENY-003', 'APPROVED', TRUE),
        ('super-eagles', 'Nigeria Super Eagles', 'nigeria super eagles', 'faitholuwibe@gmail.com', 'NPFL-NGA-000', 'APPROVED', TRUE)
      `;
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init failed:', err);
  }
}

// API Routes

async function analyzeFeedback(text: string, language: string) {
  const lowerText = text.toLowerCase();
  const heuristicCategory = inferFeedbackCategory(lowerText);

  const qualityFlags: string[] = [];
  if (looksLikeGibberish(text)) {
    qualityFlags.push('LOW_QUALITY_TEXT');
  }
  if (text.length < 40) {
    qualityFlags.push('LOW_CONTEXT');
  }
  if (/(.{12,})\1{1,}/i.test(text.replace(/\s+/g, ' '))) {
    qualityFlags.push('REPETITIVE_TEXT');
  }

  const heuristicFootballRelated = inferFootballRelevance(lowerText);
  if (!heuristicFootballRelated) {
    qualityFlags.push('NON_FOOTBALL_TOPIC');
  }

  if (!googleCloudApiKey) {
    const credibilityScore = computeCredibilityScore({
      text,
      isFootballRelated: heuristicFootballRelated,
      qualityFlags,
      entityCount: 0,
      sentimentMagnitude: 0,
    });

    return {
      isGibberish: qualityFlags.includes('LOW_QUALITY_TEXT'),
      isFootballRelated: heuristicFootballRelated,
      translatedText: text,
      detectedLanguage: sanitizeText(language || 'und', 40) || 'und',
      category: heuristicCategory,
      sentimentScore: 0,
      magnitude: 0,
      entities: [],
      justification:
        'Stored with fallback validation because Google Cloud language services are not configured.',
      credibilityScore,
      qualityFlags,
    };
  }

  try {
    const translation = await translateFeedbackText(text);
    const normalizedLanguage = translation.detectedLanguage || sanitizeText(language || 'und', 40) || 'und';
    const translatedLowerText = translation.translatedText.toLowerCase();
    const isFootballRelated =
      heuristicFootballRelated || inferFootballRelevance(translatedLowerText);
    const category = inferFeedbackCategory(translatedLowerText);
    const languageAnalysis = await analyzeNaturalLanguageText(
      translation.translatedText,
      normalizedLanguage
    );
    const credibilityScore = computeCredibilityScore({
      text: translation.translatedText,
      isFootballRelated,
      qualityFlags,
      entityCount: languageAnalysis.entities.length,
      sentimentMagnitude: languageAnalysis.magnitude,
    });

    return {
      isGibberish: qualityFlags.includes('LOW_QUALITY_TEXT'),
      isFootballRelated,
      translatedText: translation.translatedText,
      detectedLanguage: normalizedLanguage,
      category,
      sentimentScore: languageAnalysis.sentimentScore,
      magnitude: languageAnalysis.magnitude,
      entities: languageAnalysis.entities,
      justification: buildDetailedJustification({
        detectedLanguage: normalizedLanguage,
        category,
        isFootballRelated,
        sentimentScore: languageAnalysis.sentimentScore,
        magnitude: languageAnalysis.magnitude,
        credibilityScore,
        qualityFlags,
        entities: languageAnalysis.entities,
      }),
      credibilityScore,
      qualityFlags,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Google Cloud error';
    console.error('Google Cloud feedback analysis failed, using heuristic fallback:', reason);
    const credibilityScore = computeCredibilityScore({
      text,
      isFootballRelated: heuristicFootballRelated,
      qualityFlags,
      entityCount: 0,
      sentimentMagnitude: 0,
    });

    return {
      isGibberish: qualityFlags.includes('LOW_QUALITY_TEXT'),
      isFootballRelated: heuristicFootballRelated,
      translatedText: text,
      detectedLanguage: sanitizeText(language || 'und', 40) || 'und',
      category: heuristicCategory,
      sentimentScore: 0,
      magnitude: 0,
      entities: [],
      justification: `Stored with fallback validation because Google Cloud language analysis could not be completed. Reason: ${reason.slice(0, 180)}`,
      credibilityScore,
      qualityFlags: [...qualityFlags, 'AI_FALLBACK'],
    };
  }
}

async function updateUserCredibility(userId: string, feedbackCredibility: number, wasFlagged: boolean) {
  const existing = await sql`SELECT credibility_score FROM users WHERE id = ${userId}`;
  if (existing.length === 0) return null;

  const current = Number(existing[0].credibility_score || 1);
  const adjustment = wasFlagged ? -0.15 : (feedbackCredibility - 0.5) * 0.2;
  const next = Math.max(0, Math.min(1, current + adjustment));
  await sql`UPDATE users SET credibility_score = ${next} WHERE id = ${userId}`;
  return next;
}

async function backfillFeedbackAnalysisForClub(clubId: string, force = false) {
  const clubReferences = await listClubReferences();
  const staleFeedback = await sql`
    SELECT
      f.id,
      f.original_text,
      f.detected_language,
      f.user_id,
      m.club_id
    FROM feedback f
    JOIN matches m ON f.match_id = m.id
    WHERE m.club_id = ${clubId}
      AND (
        ${force}
        OR f.justification IS NULL
        OR f.justification NOT LIKE '%Overall sentiment is%'
      )
    ORDER BY f.timestamp DESC
  `;

  let updated = 0;

  for (const row of staleFeedback as any[]) {
    const analysis = await analyzeFeedback(
      String(row.original_text || ''),
      sanitizeText(row.detected_language, 40) || 'English'
    );
    const clubContext = detectClubFeedbackContext(
      String(row.original_text || ''),
      clubReferences,
      String(row.club_id)
    );
    const qualityFlags = [...(analysis.qualityFlags || [])];
    if (clubContext.isCrossClubFeedback && !qualityFlags.includes('CROSS_CLUB_FEEDBACK')) {
      qualityFlags.push('CROSS_CLUB_FEEDBACK');
    }
    const justification = clubContext.isCrossClubFeedback
      ? `${analysis.justification} Primary subject appears to be ${clubContext.primarySubjectClubName}, while the owning club is ${clubContext.ownerClubName}. Mentioned clubs: ${clubContext.mentionedClubNames.join(', ')}.`
      : clubContext.mentionedClubNames.length > 0
        ? `${analysis.justification} Mentioned clubs: ${clubContext.mentionedClubNames.join(', ')}.`
        : analysis.justification;
    const validationStatus = analysis.credibilityScore < 0.35 ? 'FLAGGED' : 'APPROVED';
    const updatedCredibility = row.user_id
      ? await updateUserCredibility(
          String(row.user_id),
          Number(analysis.credibilityScore || 0),
          validationStatus === 'FLAGGED'
        )
      : null;

    await sql`
      UPDATE feedback
      SET
        translated_text = ${analysis.translatedText},
        detected_language = ${analysis.detectedLanguage || sanitizeText(row.detected_language, 40) || 'und'},
        sentiment_score = ${analysis.sentimentScore},
        magnitude = ${analysis.magnitude},
        category = ${analysis.category},
        credibility_score = ${analysis.credibilityScore},
        justification = ${justification},
        entities = ${JSON.stringify(analysis.entities)},
        validation_status = ${validationStatus},
        quality_flags = ${JSON.stringify(qualityFlags)},
        user_credibility_snapshot = ${updatedCredibility},
        owner_club_id = ${clubContext.ownerClubId},
        primary_subject_club = ${clubContext.primarySubjectClub},
        mentioned_clubs = ${JSON.stringify(clubContext.mentionedClubs)},
        is_cross_club_feedback = ${clubContext.isCrossClubFeedback}
      WHERE id = ${row.id}
    `;

    updated += 1;
  }

  return {
    updated,
    matched: staleFeedback.length,
  };
}

// Sync User after Login
app.post('/api/auth/sync', rateLimit({ namespace: 'auth-sync', limit: 30, windowMs: 60 * 60 * 1000 }), authenticate, async (req, res) => {
  const user = (req as any).user;
  const userId = sanitizeText(user.sub || '', 255);
  const email = sanitizeText(user.email || '', 255).toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.has(email);

  if (!userId) {
    return res.status(400).json({ error: 'Authenticated user is missing an ID.' });
  }

  try {
    const existingById = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const existingByEmail = email
      ? await sql`SELECT * FROM users WHERE email = ${email}`
      : [];

    const existing = existingById[0] || existingByEmail[0] || null;

    if (!existing) {
      const clubAdmin = await getClubAdminInfoByEmail(email);
      const role: UserRole = isSuperAdmin
        ? 'SUPER_ADMIN'
        : clubAdmin.length > 0 && clubAdmin[0].status === 'APPROVED'
          ? 'ADMIN'
          : 'USER';
      const status: UserStatus =
        clubAdmin.length > 0 && clubAdmin[0].status !== 'APPROVED'
          ? 'PENDING_APPROVAL'
          : 'ACTIVE';
      const clubId = clubAdmin.length > 0 ? clubAdmin[0].id : null;

      await sql`
        INSERT INTO users (id, email, role, club_id, status, approved_at)
        VALUES (
          ${userId},
          ${email || null},
          ${role},
          ${clubId},
          ${isSuperAdmin ? 'ACTIVE' : status},
          ${isSuperAdmin || status === 'ACTIVE' ? new Date() : null}
        )
      `;
    } else {
      const clubAdmin = await getClubAdminInfoByEmail(email);
      const nextRole: UserRole = isSuperAdmin
        ? 'SUPER_ADMIN'
        : clubAdmin.length > 0 && clubAdmin[0].status === 'APPROVED'
          ? 'ADMIN'
          : (existing.role as UserRole);
      const nextStatus: UserStatus =
        existing.status === 'BLOCKED'
          ? 'BLOCKED'
          : clubAdmin.length > 0 && clubAdmin[0].status !== 'APPROVED'
            ? 'PENDING_APPROVAL'
            : 'ACTIVE';
      const nextClubId = clubAdmin.length > 0 ? clubAdmin[0].id : existing.club_id;
      await sql`
        UPDATE users
        SET id = ${userId},
            email = ${email || null},
            role = ${nextRole},
            club_id = ${nextClubId},
            status = ${nextStatus}
        WHERE id = ${existing.id}
      `;
    }
    const synced = await sql`SELECT * FROM users WHERE id = ${userId}`;
    res.json(synced[0]);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to sync user'
    });
  }
});

// Register Club
app.post('/api/admin/register-club', rateLimit({ namespace: 'register-club', limit: 5, windowMs: 60 * 60 * 1000 }), authenticate, async (req, res) => {
  const rawName = sanitizeText(req.body.name, 120);
  const npflId = sanitizeText(req.body.npflId, 80) || null;
  const logoUrl = sanitizeOptionalUrl(req.body.logoUrl);
  const user = (req as any).user;
  const email = sanitizeText(user.email || '', 255).toLowerCase();

  if (!rawName) {
    return res.status(400).json({ error: 'Club name is required.' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Your account must have a valid email address before registering a club.' });
  }

  if (req.body.logoUrl && !logoUrl) {
    return res.status(400).json({ error: 'Logo upload is invalid. Please choose a smaller image file.' });
  }

  const clubId = normalizeClubSlug(rawName);
  const normalizedName = normalizeClubName(rawName);
  const reviewDueAt = getReviewDueAt();

  try {
    const existingUserById = await sql`SELECT * FROM users WHERE id = ${user.sub}`;
    const existingUserByEmail = await sql`SELECT * FROM users WHERE email = ${email}`;
    const existingUser = existingUserById[0] || existingUserByEmail[0] || null;

    if (existingUser?.club_id) {
      return res.status(400).json({ error: 'You already have a club registration in progress or assigned.' });
    }

    const existingClub = npflId
      ? await sql`
          SELECT id
          FROM clubs
          WHERE id = ${clubId}
            OR normalized_name = ${normalizedName}
            OR npfl_id = ${npflId}
            OR admin_email = ${email}
        `
      : await sql`
          SELECT id
          FROM clubs
          WHERE id = ${clubId}
            OR normalized_name = ${normalizedName}
            OR admin_email = ${email}
        `;
    if (existingClub.length > 0) {
      return res.status(400).json({ error: 'A club with this name, license, or admin email already exists.' });
    }

    await sql`
      INSERT INTO clubs (
        id, name, normalized_name, npfl_id, logo_url, admin_email,
        status, submitted_at, review_due_at, is_active
      )
      VALUES (
        ${clubId}, ${rawName}, ${normalizedName}, ${npflId}, ${logoUrl}, ${email},
        'PENDING', CURRENT_TIMESTAMP, ${reviewDueAt}, FALSE
      )
    `;

    if (existingUser) {
      await sql`
        UPDATE users
        SET id = ${user.sub},
            email = ${email},
            role = 'USER',
            club_id = ${clubId},
            status = 'PENDING_APPROVAL'
        WHERE id = ${existingUser.id}
      `;
    } else {
      await sql`
        INSERT INTO users (id, email, role, club_id, status)
        VALUES (${user.sub}, ${email}, 'USER', ${clubId}, 'PENDING_APPROVAL')
      `;
    }

    res.json({
      success: true,
      clubId,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      reviewDueAt: reviewDueAt.toISOString(),
      message: 'Your club is under review. Approval typically takes 24 to 72 hours.'
    });
  } catch (error) {
    console.error('Club registration error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to register club'
    });
  }
});

app.get('/api/clubs/my-request', authenticate, async (req, res) => {
  const userRecord = await requireUserRecord(req, res);
  if (!userRecord) return;
  if (!userRecord.club_id) {
    return res.status(404).json({ error: 'No club registration found for this user.' });
  }

  const club = await sql`
    SELECT id, name, status, submitted_at, review_due_at, reviewed_at, rejection_reason, is_active
    FROM clubs
    WHERE id = ${userRecord.club_id}
  `;

  if (club.length === 0) {
    return res.status(404).json({ error: 'Club request not found.' });
  }

  res.json({
    club: club[0],
    userStatus: userRecord.status,
    role: userRecord.role,
  });
});

app.get('/api/super-admin/club-requests', authenticate, async (req, res) => {
  const superAdmin = await requireRole(req, res, ['SUPER_ADMIN']);
  if (!superAdmin) return;

  const clubs = await sql`
    SELECT c.*, u.email AS requester_email, u.id AS requester_id
    FROM clubs c
    LEFT JOIN users u ON u.club_id = c.id
    WHERE c.status IN ('PENDING', 'REJECTED')
    ORDER BY c.submitted_at DESC
  `;
  res.json(clubs);
});

app.post('/api/super-admin/club-requests/:clubId/decision', authenticate, async (req, res) => {
  const superAdmin = await requireRole(req, res, ['SUPER_ADMIN']);
  if (!superAdmin) return;

  const clubId = sanitizeText(req.params.clubId, 120);
  const action = req.body.action === 'reject' ? 'reject' : 'approve';
  const reason = sanitizeText(req.body.reason, 500) || null;
  const reviewedAt = new Date();

  const clubs = await sql`SELECT * FROM clubs WHERE id = ${clubId}`;
  if (clubs.length === 0) {
    return res.status(404).json({ error: 'Club request not found.' });
  }

  try {
    if (action === 'approve') {
      await sql`
        UPDATE clubs
        SET status = 'APPROVED',
            is_active = TRUE,
            reviewed_at = ${reviewedAt},
            reviewed_by = ${superAdmin.id},
            rejection_reason = NULL
        WHERE id = ${clubId}
      `;
      await sql`
        UPDATE users
        SET role = 'ADMIN',
            status = 'ACTIVE',
            approved_at = ${reviewedAt}
        WHERE club_id = ${clubId}
      `;
    } else {
      await sql`
        UPDATE clubs
        SET status = 'REJECTED',
            is_active = FALSE,
            reviewed_at = ${reviewedAt},
            reviewed_by = ${superAdmin.id},
            rejection_reason = ${reason}
        WHERE id = ${clubId}
      `;
      await sql`
        UPDATE users
        SET role = 'USER',
            status = 'REJECTED'
        WHERE club_id = ${clubId}
      `;
    }

    res.json({
      success: true,
      clubId,
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedAt: reviewedAt.toISOString(),
      reviewSlaHours: CLUB_REVIEW_HOURS,
    });
  } catch (error) {
    console.error('Club review error:', error);
    res.status(500).json({ error: 'Failed to update club review status' });
  }
});

// Block User
app.post('/api/admin/block-user', authenticate, async (req, res) => {
  const { userId, isBlocked } = req.body;
  const reason = sanitizeText(req.body.reason, 200) || null;
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  if (!userId || typeof isBlocked !== 'boolean') {
    return res.status(400).json({ error: 'userId and isBlocked are required.' });
  }

  try {
    await sql`
      UPDATE users
      SET is_blocked = ${isBlocked},
          status = ${isBlocked ? 'BLOCKED' : 'ACTIVE'},
          blocked_at = ${isBlocked ? new Date() : null},
          blocked_reason = ${isBlocked ? reason : null}
      WHERE id = ${userId}
    `;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Submit Feedback
app.post('/api/feedback', async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const language = sanitizeText(req.body.language, 80) || 'English';
  const rawMatchId = sanitizeText(req.body.matchId, 120);
  const subject = sanitizeText(req.body.subject, 120);
  const topicType = normalizeTopicType(req.body.topicType);
  const subheading = normalizeSubheadingForTopic(topicType, req.body.subheading);
  const isAnonymous = Boolean(req.body.isAnonymous);
  const token = getTokenFromHeader(req);

  if (!text || (!rawMatchId && !subject)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (text.length < MIN_FEEDBACK_LENGTH || text.length > MAX_FEEDBACK_LENGTH) {
    return res.status(400).json({
      error: `Feedback must be between ${MIN_FEEDBACK_LENGTH} and ${MAX_FEEDBACK_LENGTH} characters.`,
    });
  }

  const rateLimitKey = token ? `user:${token.slice(0, 24)}` : `ip:${req.ip}`;
  const limiter = applyRateLimit(`feedback:${rateLimitKey}`, token ? 20 : 5, 60 * 60 * 1000);
  res.setHeader('X-RateLimit-Limit', token ? '20' : '5');
  res.setHeader('X-RateLimit-Remaining', String(limiter.remaining));
  if (!limiter.allowed) {
    return res.status(429).json({
      error: 'Too many feedback submissions. Please try again later.',
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
  }

  let verifiedUserId: string | null = null;
  let userCredibilitySnapshot: number | null = null;

  if (token) {
    try {
      const payload = await verifyToken(token);
      verifiedUserId = String(payload.sub);
      const users = await sql`SELECT id, status, is_blocked, credibility_score FROM users WHERE id = ${verifiedUserId}`;
      if (users.length > 0) {
        const currentUser = users[0];
        if (currentUser.is_blocked || currentUser.status === 'BLOCKED') {
          return res.status(403).json({ error: 'Your account has been blocked from submitting feedback.' });
        }
        userCredibilitySnapshot = Number(currentUser.credibility_score || 0);
      }
    } catch (err) {
      console.error('Auth error in feedback:', err);
      if (!isAnonymous) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
    }
  }

  if (!isAnonymous && !verifiedUserId) {
    return res.status(401).json({ error: 'Authenticated feedback requires a valid account session.' });
  }

  try {
    const matchId = await resolveGeneralFeedbackMatch({
      matchId: rawMatchId,
      subject,
      topicType,
      subheading,
    });

    const matches = await sql`
      SELECT
        m.*,
        COALESCE(c.status, 'APPROVED') AS club_status,
        COALESCE(c.is_active, TRUE) AS club_is_active
      FROM matches m
      JOIN clubs c ON c.id = m.club_id
      WHERE m.id = ${matchId}
    `;

    if (matches.length === 0) {
      return res.status(404).json({ error: 'Feedback link not found.' });
    }

    const match = matches[0];
    if (!match.club_is_active || match.club_status !== 'APPROVED') {
      return res.status(403).json({ error: 'This club is not active for feedback collection yet.' });
    }

    if (match.expires_at && new Date(match.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This feedback link has expired.' });
    }

    if (match.audience === 'AUTHENTICATED' && !verifiedUserId) {
      return res.status(403).json({ error: 'This feedback link only accepts authenticated users.' });
    }

    if (match.audience === 'ANONYMOUS' && verifiedUserId && !isAnonymous) {
      return res.status(403).json({ error: 'This feedback link only accepts anonymous feedback.' });
    }

    const analysis = await analyzeFeedback(text, language);
    const clubReferences = await listClubReferences();
    const clubContext = detectClubFeedbackContext(text, clubReferences, String(match.club_id));
    const qualityFlags = [...(analysis.qualityFlags || [])];
    if (clubContext.isCrossClubFeedback && !qualityFlags.includes('CROSS_CLUB_FEEDBACK')) {
      qualityFlags.push('CROSS_CLUB_FEEDBACK');
    }
    const justification = clubContext.isCrossClubFeedback
      ? `${analysis.justification} Primary subject appears to be ${clubContext.primarySubjectClubName}, while the owning club is ${clubContext.ownerClubName}. Mentioned clubs: ${clubContext.mentionedClubNames.join(', ')}.`
      : clubContext.mentionedClubNames.length > 0
        ? `${analysis.justification} Mentioned clubs: ${clubContext.mentionedClubNames.join(', ')}.`
        : analysis.justification;

    if (analysis.isGibberish || !analysis.isFootballRelated) {
      return res.status(400).json({ 
        error: 'Feedback rejected: Must be football-related and meaningful.',
        details: analysis
      });
    }

    const validationStatus = analysis.credibilityScore < 0.35 ? 'FLAGGED' : 'APPROVED';
    const feedbackId = crypto.randomUUID();
    const updatedCredibility = verifiedUserId
      ? await updateUserCredibility(verifiedUserId, Number(analysis.credibilityScore || 0), validationStatus === 'FLAGGED')
      : null;
    await sql`
      INSERT INTO feedback (
        id, match_id, user_id, original_text, translated_text, 
        detected_language, sentiment_score, magnitude, category, 
        credibility_score, justification, entities, is_anonymous,
        validation_status, quality_flags, source_ip_hash, user_credibility_snapshot,
        owner_club_id, primary_subject_club, mentioned_clubs, is_cross_club_feedback
      ) VALUES (
        ${feedbackId}, ${matchId}, ${verifiedUserId || null}, ${text}, ${analysis.translatedText},
        ${analysis.detectedLanguage || language}, ${analysis.sentimentScore}, ${analysis.magnitude}, ${analysis.category},
        ${analysis.credibilityScore}, ${justification}, ${JSON.stringify(analysis.entities)}, ${isAnonymous},
        ${validationStatus}, ${JSON.stringify(qualityFlags)}, ${hashIp(req.ip)}, ${updatedCredibility ?? userCredibilitySnapshot},
        ${clubContext.ownerClubId}, ${clubContext.primarySubjectClub}, ${JSON.stringify(clubContext.mentionedClubs)}, ${clubContext.isCrossClubFeedback}
      )
    `;

    res.json({ id: feedbackId, validationStatus, ...analysis, qualityFlags, justification, clubContext });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Admin Feedback
app.get('/api/admin/feedback', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { clubId } = req.query;
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  if (!clubId || typeof clubId !== 'string') return res.status(400).json({ error: 'Club ID required' });

  if (adminUser.role !== 'SUPER_ADMIN' && adminUser.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const feedback = await sql`
      SELECT f.*, m.opponent, m.match_date, m.topic_type, m.subheading, m.expires_at, u.email as user_email, u.is_blocked, u.credibility_score as user_credibility, u.status as user_status,
             owner_club.name AS owner_club_name, primary_club.name AS primary_subject_club_name
      FROM feedback f
      JOIN matches m ON f.match_id = m.id
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN clubs owner_club ON owner_club.id = f.owner_club_id
      LEFT JOIN clubs primary_club ON primary_club.id = f.primary_subject_club
      WHERE m.club_id = ${clubId as string}
      ORDER BY f.timestamp DESC
    `;
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.get('/api/admin/links', authenticate, async (req, res) => {
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  const { clubId } = req.query;
  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({ error: 'Club ID required' });
  }

  if (adminUser.role !== 'SUPER_ADMIN' && adminUser.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const links = await sql`
      SELECT
        m.id,
        m.club_id,
        m.opponent,
        m.sharable_id,
        m.topic_type,
        m.subheading,
        m.expires_at,
        m.audience,
        m.match_date,
        COUNT(f.id)::int AS feedback_count,
        AVG(f.sentiment_score) AS avg_sentiment,
        AVG(f.credibility_score) AS avg_credibility
      FROM matches m
      LEFT JOIN feedback f ON f.match_id = m.id
      WHERE m.club_id = ${clubId}
        AND m.sharable_id IS NOT NULL
      GROUP BY m.id
      ORDER BY m.match_date DESC
    `;
    res.json(links);
  } catch (error) {
    console.error('Failed to fetch shareable links:', error);
    res.status(500).json({ error: 'Failed to fetch shareable links' });
  }
});

app.post('/api/admin/feedback/backfill-analysis', authenticate, async (req, res) => {
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  const clubId = sanitizeText(req.body.clubId, 120);
  const force = Boolean(req.body.force);

  if (!clubId) {
    return res.status(400).json({ error: 'Club ID required.' });
  }

  if (adminUser.role !== 'SUPER_ADMIN' && adminUser.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await backfillFeedbackAnalysisForClub(clubId, force);
    res.json({
      message: `Backfilled ${result.updated} feedback record(s).`,
      ...result,
    });
  } catch (error) {
    console.error('Feedback backfill error:', error);
    res.status(500).json({ error: 'Failed to backfill feedback analysis.' });
  }
});

app.post('/api/admin/links/:sharableId/summary', authenticate, async (req, res) => {
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  const sharableId = sanitizeText(req.params.sharableId, 120);
  const sendEmail = Boolean(req.body.sendEmail);

  if (!sharableId) {
    return res.status(400).json({ error: 'Sharable ID required.' });
  }

  try {
    const matches = await sql`
      SELECT m.*, c.name AS club_name, c.admin_email
      FROM matches m
      JOIN clubs c ON c.id = m.club_id
      WHERE m.sharable_id = ${sharableId}
      LIMIT 1
    `;

    if (matches.length === 0) {
      return res.status(404).json({ error: 'Sharable link not found.' });
    }

    const match = matches[0];
    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.club_id !== match.club_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const feedbackRows = await sql`
      SELECT f.*, m.opponent, m.subheading
      FROM feedback f
      JOIN matches m ON m.id = f.match_id
      WHERE f.match_id = ${match.id}
      ORDER BY f.timestamp DESC
    `;

    const digest = buildLinkDigest(match, feedbackRows as any[]);
    let emailResult: { sent: boolean; reason?: string; id?: string } = { sent: false };

    if (sendEmail) {
      if (!match.admin_email) {
        return res.status(400).json({ error: 'This club does not have an admin email configured.' });
      }

      emailResult = await sendDigestEmail({
        to: match.admin_email,
        subject: digest.subjectLine,
        html: digest.htmlBody,
        text: digest.textBody,
      });
    }

    res.json({
      match: {
        sharableId: match.sharable_id,
        opponent: match.opponent,
        topicType: match.topic_type,
        subheading: match.subheading,
        clubName: match.club_name,
        adminEmail: match.admin_email,
      },
      digest,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
      emailId: emailResult.id || null,
    });
  } catch (error) {
    console.error('Failed to build shareable link digest:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate link summary.',
    });
  }
});

// Get Match Details for Sharable Link
app.get('/api/matches/:sharableId', async (req, res) => {
  const { sharableId } = req.params;
  try {
    const match = await sql`
      SELECT m.*, c.name as club_name, c.status as club_status, c.is_active as club_is_active
      FROM matches m
      JOIN clubs c ON m.club_id = c.id
      WHERE m.sharable_id = ${sharableId}
    `;
    if (match.length === 0) return res.status(404).json({ error: 'Match not found' });
    if (match[0].expires_at && new Date(match[0].expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This sharable link has expired.' });
    }
    if (!match[0].club_is_active || match[0].club_status !== 'APPROVED') {
      return res.status(403).json({ error: 'This club is not active yet.' });
    }
    res.json(match[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// Create Sharable Link
app.post('/api/admin/links', rateLimit({
  namespace: 'admin-links',
  limit: 10,
  windowMs: 60 * 60 * 1000,
  keyResolver: (req) => ((req as any).user?.sub ? String((req as any).user.sub) : null),
}), authenticate, async (req, res) => {
  const adminUser = await requireRole(req, res, ['ADMIN', 'SUPER_ADMIN']);
  if (!adminUser) return;

  const clubId = sanitizeText(req.body.clubId, 120);
  const opponent = sanitizeText(req.body.opponent, 120);
  const topicType = normalizeTopicType(req.body.topicType);
  const subheading = normalizeSubheadingForTopic(topicType, req.body.subheading);
  const audience = getAudience(req.body.audience);
  const expiresAt = getLinkExpiry(req.body.expiresInHours);

  if (!clubId || !opponent) {
    return res.status(400).json({ error: 'clubId and opponent are required.' });
  }

  if (adminUser.role !== 'SUPER_ADMIN' && adminUser.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const clubs = await sql`SELECT status, is_active FROM clubs WHERE id = ${clubId}`;
  if (clubs.length === 0) {
    return res.status(404).json({ error: 'Club not found.' });
  }
  if (!clubs[0].is_active || clubs[0].status !== 'APPROVED') {
    return res.status(403).json({ error: 'Club must be approved before creating sharable links.' });
  }

  const id = crypto.randomUUID();
  const sharableId = crypto.randomBytes(4).toString('hex');
  
  try {
    await sql`
      INSERT INTO matches (id, club_id, opponent, sharable_id, topic_type, subheading, expires_at, created_by, audience)
      VALUES (${id}, ${clubId}, ${opponent}, ${sharableId}, ${topicType}, ${subheading}, ${expiresAt}, ${adminUser.id}, ${audience})
    `;
    res.json({ id, sharableId, expiresAt: expiresAt.toISOString(), topicType, subheading, audience });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Vite middleware for development
async function startServer() {
  await initDb();

  app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Upload is too large. Please choose a smaller image or shorter request payload.',
      });
    }

    return next(error);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
