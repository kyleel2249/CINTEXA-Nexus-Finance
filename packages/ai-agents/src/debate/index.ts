/**
 * Multi-Agent Cross-Examination & Consensus
 * Surfaces disagreements with evidence comparison rather than forcing a single view.
 */

import type { AgentFinding } from '../agents';
import type { RiskLevel } from '@cintexa/shared';

export interface DebateItem {
  topic: string;
  positions: Array<{
    agent: string;
    conclusion: string;
    evidence: string;
    severity: RiskLevel;
    confidence: number;
  }>;
  strongerEvidence: string;
  finalDetermination: string;
  consensusSeverity: RiskLevel;
  confidence: number;
  dissentNotes?: string;
}

const SEVERITY_RANK: Record<RiskLevel, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  SEVERE: 4,
  CRITICAL: 5,
};

export function detectConflicts(findings: AgentFinding[]): DebateItem[] {
  // Group by rough topic keywords
  const topics = new Map<string, AgentFinding[]>();
  for (const f of findings) {
    const key = f.title.toLowerCase().includes('going')
      ? 'going-concern'
      : f.title.toLowerCase().includes('cash')
        ? 'cash-flow'
        : f.title.toLowerCase().includes('reconcil')
          ? 'reconciliation'
          : f.title.toLowerCase().includes('beneish') || f.title.toLowerCase().includes('earnings')
            ? 'earnings-quality'
            : f.agent;
    if (!topics.has(key)) topics.set(key, []);
    topics.get(key)!.push(f);
  }

  const debates: DebateItem[] = [];
  for (const [topic, group] of topics) {
    if (group.length < 2) continue;
    const severities = group.map((g) => SEVERITY_RANK[g.severity]);
    const max = Math.max(...severities);
    const min = Math.min(...severities);
    if (max - min < 2) continue; // no material disagreement

    const sorted = [...group].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.confidence - a.confidence);
    const lead = sorted[0];
    debates.push({
      topic,
      positions: group.map((g) => ({
        agent: g.agent,
        conclusion: g.finding,
        evidence: g.evidence,
        severity: g.severity,
        confidence: g.confidence,
      })),
      strongerEvidence: `Higher severity / confidence position from ${lead.agent}: ${lead.evidence}`,
      finalDetermination: lead.finding,
      consensusSeverity: lead.severity,
      confidence: Math.round(group.reduce((s, g) => s + g.confidence, 0) / group.length),
      dissentNotes: `Agents differed on severity (range ${min}–${max}). Panel adopts the more conservative view pending further evidence.`,
    });
  }
  return debates;
}

export function buildPanelConclusion(findings: AgentFinding[], debates: DebateItem[]) {
  const critical = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'SEVERE');
  const high = findings.filter((f) => f.severity === 'HIGH');
  return {
    totalFindings: findings.length,
    criticalOrSevere: critical.length,
    high: high.length,
    debates: debates.length,
    summary:
      critical.length > 0
        ? `Panel identified ${critical.length} critical/severe issue(s). Immediate management and board attention required.`
        : high.length > 0
          ? `Panel identified ${high.length} high-severity findings requiring prompt action.`
          : 'No critical or high-severity consensus findings. Continue monitoring.',
    topPriorities: [...critical, ...high].slice(0, 5).map((f) => ({
      title: f.title,
      priority: f.priority,
      agent: f.agent,
    })),
  };
}
