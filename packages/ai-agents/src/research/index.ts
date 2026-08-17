/**
 * Research guardrails & source hierarchy
 */

import { SOURCE_TIERS } from '@cintexa/shared';

export interface ResearchClaim {
  claim: string;
  source: string;
  url?: string;
  publicationDate?: string;
  sourceType: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  confidence: number;
  verified: boolean;
  notes?: string;
}

export function describeTier(tier: number): string {
  return SOURCE_TIERS[tier as keyof typeof SOURCE_TIERS] || 'Unknown';
}

export function validateClaim(claim: Partial<ResearchClaim>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!claim.claim) errors.push('Missing claim text');
  if (!claim.source) errors.push('Missing source');
  if (claim.tier == null) errors.push('Missing source tier');
  if (claim.confidence == null) errors.push('Missing confidence');
  if (claim.tier !== undefined && claim.tier >= 5 && claim.verified) {
    errors.push('Tier 5–6 sources cannot be marked verified without independent corroboration');
  }
  return { ok: errors.length === 0, errors };
}

export function researchCompanyContext(input: {
  companyName: string;
  industry?: string;
  country?: string;
}): { claims: ResearchClaim[]; limitations: string[] } {
  return {
    claims: [],
    limitations: [
      `No external research claims were automatically verified for ${input.companyName}.`,
      'Industry benchmarks and competitor figures must come from Tier 1–3 sources before use in peer comparison.',
      'Internet information is contextual only and is not treated as audited financial evidence.',
    ],
  };
}

export function rankEvidence(...claims: ResearchClaim[]): ResearchClaim[] {
  return [...claims].sort((a, b) => a.tier - b.tier || b.confidence - a.confidence);
}
