/**
 * Continuous monitoring — narrative of what changed between analyses
 */

export interface MonitoringDelta {
  summary: string;
  improved: string[];
  deteriorated: string[];
  newRisks: string[];
  resolvedRisks: string[];
  healthDelta?: number;
  survivalDelta?: number;
  runwayDelta?: number;
}

export function narrateMonitoringChange(input: {
  previous?: {
    healthScore?: number;
    survival12m?: number;
    runwayMonths?: number;
    failureRisk?: string;
    findingTitles?: string[];
  };
  current: {
    healthScore?: number;
    survival12m?: number;
    runwayMonths?: number;
    failureRisk?: string;
    findingTitles?: string[];
  };
}): MonitoringDelta {
  const { previous, current } = input;
  if (!previous) {
    return {
      summary: 'Initial analysis baseline established. Subsequent uploads will report what changed.',
      improved: [],
      deteriorated: [],
      newRisks: current.findingTitles || [],
      resolvedRisks: [],
    };
  }

  const improved: string[] = [];
  const deteriorated: string[] = [];
  const healthDelta =
    current.healthScore != null && previous.healthScore != null ? current.healthScore - previous.healthScore : undefined;
  const survivalDelta =
    current.survival12m != null && previous.survival12m != null ? current.survival12m - previous.survival12m : undefined;
  const runwayDelta =
    current.runwayMonths != null && previous.runwayMonths != null ? current.runwayMonths - previous.runwayMonths : undefined;

  if (healthDelta != null) {
    if (healthDelta >= 3) improved.push(`Financial health score improved by ${healthDelta.toFixed(1)} points`);
    if (healthDelta <= -3) deteriorated.push(`Financial health score declined by ${Math.abs(healthDelta).toFixed(1)} points`);
  }
  if (survivalDelta != null) {
    if (survivalDelta >= 5) improved.push(`12-month survival estimate increased by ${survivalDelta.toFixed(1)} pp`);
    if (survivalDelta <= -5) deteriorated.push(`12-month survival estimate fell by ${Math.abs(survivalDelta).toFixed(1)} pp`);
  }
  if (runwayDelta != null) {
    if (runwayDelta >= 1) improved.push(`Estimated runway extended by ${runwayDelta.toFixed(1)} months`);
    if (runwayDelta <= -1) deteriorated.push(`Estimated runway shortened by ${Math.abs(runwayDelta).toFixed(1)} months`);
  }
  if (previous.failureRisk && current.failureRisk && previous.failureRisk !== current.failureRisk) {
    const order = ['LOW', 'MODERATE', 'HIGH', 'SEVERE', 'CRITICAL'];
    const worse = order.indexOf(current.failureRisk) > order.indexOf(previous.failureRisk);
    (worse ? deteriorated : improved).push(`Failure risk moved from ${previous.failureRisk} to ${current.failureRisk}`);
  }

  const prevSet = new Set(previous.findingTitles || []);
  const currSet = new Set(current.findingTitles || []);
  const newRisks = [...currSet].filter((x) => !prevSet.has(x));
  const resolvedRisks = [...prevSet].filter((x) => !currSet.has(x));

  let summary = 'No material change detected versus prior analysis.';
  if (deteriorated.length && !improved.length) summary = 'Overall trajectory deteriorated versus prior analysis.';
  else if (improved.length && !deteriorated.length) summary = 'Overall trajectory improved versus prior analysis.';
  else if (improved.length && deteriorated.length) summary = 'Mixed changes versus prior analysis — review improved and deteriorated items.';
  if (newRisks.length) summary += ` ${newRisks.length} new risk title(s) appeared.`;

  return {
    summary,
    improved,
    deteriorated,
    newRisks,
    resolvedRisks,
    healthDelta,
    survivalDelta,
    runwayDelta,
  };
}
