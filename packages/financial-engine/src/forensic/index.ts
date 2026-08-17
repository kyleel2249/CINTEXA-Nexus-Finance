/**
 * Forensic anomaly screening
 * Important: anomalies require investigation — never labeled as fraud automatically.
 */

export interface ForensicFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  evidence: string;
  recommendation: string;
  /** Always investigation-oriented language */
  disposition: 'REQUIRES_INVESTIGATION' | 'POTENTIAL_ANOMALY' | 'INSUFFICIENT_EVIDENCE' | 'AUDIT_ATTENTION_RECOMMENDED';
  confidence: number;
}

/** Benford's Law first-digit expected proportions */
const BENFORD = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function firstDigit(n: number): number | null {
  const v = Math.abs(n);
  if (!isFinite(v) || v < 1) return null;
  const s = v.toExponential();
  // use scientific: digit before e
  const m = s.match(/^(\d)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Apply Benford screening to a set of positive magnitudes.
 * Needs a reasonable sample; small samples return insufficient evidence.
 */
export function screenBenford(values: number[], label = 'line items'): ForensicFinding | null {
  const digits = values.map(firstDigit).filter((d): d is number => d != null && d >= 1 && d <= 9);
  if (digits.length < 20) {
    return {
      id: 'benford_insufficient',
      type: 'BENFORD',
      title: 'Benford screening — insufficient sample',
      description: `Only ${digits.length} eligible observations for ${label}. Benford analysis is not reliable below ~20 observations.`,
      severity: 'LOW',
      evidence: `n=${digits.length}`,
      recommendation: 'Collect a larger set of transaction or line-item magnitudes before relying on digit analysis.',
      disposition: 'INSUFFICIENT_EVIDENCE',
      confidence: 40,
    };
  }

  const counts = Array(9).fill(0);
  for (const d of digits) counts[d - 1]++;
  const n = digits.length;
  let chi = 0;
  for (let i = 0; i < 9; i++) {
    const expected = BENFORD[i] * n;
    chi += ((counts[i] - expected) ** 2) / (expected || 1);
  }

  // df=8 critical ~15.51 at 5%
  const elevated = chi > 15.51;
  return {
    id: `benford_${Date.now().toString(36)}`,
    type: 'BENFORD',
    title: elevated ? 'Benford first-digit deviation' : 'Benford first-digit screen within tolerance',
    description: elevated
      ? `Chi-square statistic ${chi.toFixed(2)} exceeds the conventional 5% critical value (~15.51). This is a statistical anomaly signal only.`
      : `Chi-square statistic ${chi.toFixed(2)} does not exceed the conventional threshold. No strong first-digit anomaly detected.`,
    severity: elevated ? 'MODERATE' : 'LOW',
    evidence: `n=${n}, chi²=${chi.toFixed(2)}, counts=[${counts.join(',')}]`,
    recommendation: elevated
      ? 'Requires investigation: review unusual concentrations, round-number postings and year-end journals. Do not conclude fraud from this test alone.'
      : 'No further Benford follow-up indicated from this sample alone.',
    disposition: elevated ? 'REQUIRES_INVESTIGATION' : 'AUDIT_ATTENTION_RECOMMENDED',
    confidence: Math.min(85, 50 + Math.floor(n / 5)),
  };
}

export function screenEarningsCashDivergence(ni: number, ocf: number): ForensicFinding | null {
  if (ni > 0 && ocf < 0) {
    return {
      id: 'earn_cash_div',
      type: 'EARNINGS_CASH_DIVERGENCE',
      title: 'Positive earnings with negative operating cash flow',
      description: 'Reported profitability is not converting into operating cash. May reflect working-capital stress, recognition timing, or non-cash items.',
      severity: 'HIGH',
      evidence: `Net income ${ni}, Operating cash flow ${ocf}`,
      recommendation: 'Requires investigation of receivables, inventory, payables, and revenue cut-off. Potential anomaly — insufficient evidence for misconduct conclusions.',
      disposition: 'REQUIRES_INVESTIGATION',
      confidence: 75,
    };
  }
  return null;
}

export function screenRoundNumberConcentration(values: number[]): ForensicFinding | null {
  const eligible = values.filter((v) => isFinite(v) && Math.abs(v) >= 100);
  if (eligible.length < 10) return null;
  const roundish = eligible.filter((v) => Math.abs(v) % 1000 === 0 || Math.abs(v) % 10000 === 0);
  const pct = roundish.length / eligible.length;
  if (pct >= 0.35) {
    return {
      id: 'round_numbers',
      type: 'ROUND_NUMBER_CONCENTRATION',
      title: 'Elevated round-number concentration',
      description: `${(pct * 100).toFixed(0)}% of sampled magnitudes are round thousands/ten-thousands. May be legitimate (budgets, estimates) or warrant journal review.`,
      severity: 'MODERATE',
      evidence: `round=${roundish.length}/${eligible.length}`,
      recommendation: 'Audit attention recommended on estimate-heavy and period-end entries. Not evidence of fraud by itself.',
      disposition: 'POTENTIAL_ANOMALY',
      confidence: 60,
    };
  }
  return null;
}

export function runForensicScreens(input: {
  magnitudes?: number[];
  netIncome?: number;
  operatingCashFlow?: number;
}): ForensicFinding[] {
  const findings: ForensicFinding[] = [];
  if (input.magnitudes?.length) {
    const b = screenBenford(input.magnitudes);
    if (b) findings.push(b);
    const r = screenRoundNumberConcentration(input.magnitudes);
    if (r) findings.push(r);
  }
  if (input.netIncome != null && input.operatingCashFlow != null) {
    const d = screenEarningsCashDivergence(input.netIncome, input.operatingCashFlow);
    if (d) findings.push(d);
  }
  return findings;
}
