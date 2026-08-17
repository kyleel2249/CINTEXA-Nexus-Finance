/**
 * Structured audit workpapers from agent findings
 */

import type { AgentFinding } from '../agents';

export type WorkpaperStatus = 'PASS' | 'FAIL' | 'EXCEPTION' | 'REVIEW_REQUIRED' | 'INSUFFICIENT_EVIDENCE';

export interface AuditWorkpaper {
  objective: string;
  assertion: string;
  evidence: string;
  procedure: string;
  result: string;
  exception?: string;
  risk: string;
  conclusion: string;
  recommendedFollowUp: string;
  status: WorkpaperStatus;
  agent: string;
  severity: string;
}

export function findingsToWorkpapers(findings: AgentFinding[]): AuditWorkpaper[] {
  return findings.map((f) => {
    let status: WorkpaperStatus = 'REVIEW_REQUIRED';
    if (f.severity === 'LOW') status = 'PASS';
    else if (f.severity === 'CRITICAL' || f.severity === 'SEVERE') status = 'FAIL';
    else if (f.severity === 'HIGH') status = 'EXCEPTION';
    if (f.confidence < 50) status = 'INSUFFICIENT_EVIDENCE';

    return {
      objective: `Evaluate: ${f.title}`,
      assertion: f.title,
      evidence: f.evidence,
      procedure: `Agent ${f.agent} analytical review`,
      result: f.finding,
      exception: f.severity === 'LOW' ? undefined : f.finding,
      risk: f.risk,
      conclusion: f.recommendation,
      recommendedFollowUp: f.recommendation,
      status,
      agent: f.agent,
      severity: f.severity,
    };
  });
}
