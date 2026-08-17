/**
 * Industry benchmark comparison scaffold.
 * Never fabricates peer medians — returns explicit not-verified state without inputs.
 */

export interface BenchmarkPoint {
  metric: string;
  companyValue: number | null;
  industryMedian?: number;
  topQuartile?: number;
  bottomQuartile?: number;
  source?: string;
  verified: boolean;
}

export interface BenchmarkReport {
  status: 'VERIFIED_SET' | 'NOT_VERIFIED';
  industry?: string;
  region?: string;
  points: BenchmarkPoint[];
  limitations: string[];
}

export function compareToBenchmarks(input: {
  industry?: string;
  region?: string;
  metrics: Array<{ metric: string; companyValue: number | null }>;
  externalBenchmarks?: Array<{
    metric: string;
    industryMedian: number;
    topQuartile?: number;
    bottomQuartile?: number;
    source: string;
  }>;
}): BenchmarkReport {
  if (!input.externalBenchmarks?.length) {
    return {
      status: 'NOT_VERIFIED',
      industry: input.industry,
      region: input.region,
      points: input.metrics.map((m) => ({
        metric: m.metric,
        companyValue: m.companyValue,
        verified: false,
      })),
      limitations: [
        'No verified industry benchmark dataset was supplied for this run.',
        'Peer medians and quartiles must come from Tier 1–3 sources before comparative conclusions.',
        'Company metrics alone are shown without industry context.',
      ],
    };
  }

  const byMetric = new Map(input.externalBenchmarks.map((b) => [b.metric, b]));
  const points: BenchmarkPoint[] = input.metrics.map((m) => {
    const b = byMetric.get(m.metric);
    if (!b) {
      return { metric: m.metric, companyValue: m.companyValue, verified: false };
    }
    return {
      metric: m.metric,
      companyValue: m.companyValue,
      industryMedian: b.industryMedian,
      topQuartile: b.topQuartile,
      bottomQuartile: b.bottomQuartile,
      source: b.source,
      verified: true,
    };
  });

  return {
    status: 'VERIFIED_SET',
    industry: input.industry,
    region: input.region,
    points,
    limitations: ['Benchmarks only as reliable as the provided external source set.'],
  };
}
