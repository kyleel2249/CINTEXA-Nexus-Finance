import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { AppError } from '../middleware/errorHandler.js';

export const cfoChatRouter = Router();

/**
 * Deterministic AI CFO responses grounded in analysis output.
 * Production path can augment with LLM while still requiring evidence from the profile.
 */
cfoChatRouter.post('/', (req, res, next) => {
  try {
    const body = z
      .object({
        question: z.string().min(3),
        current: z.object({
          label: z.string(),
          fiscalYear: z.number(),
          incomeStatement: z.record(z.any()),
          balanceSheet: z.record(z.any()),
          cashFlow: z.record(z.any()),
        }),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, undefined, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') {
      return res.status(422).json(result);
    }

    const q = body.question.toLowerCase();
    const h = result.intelligence.analysis.health;
    const s = result.intelligence.analysis.survival;
    const ratios = result.intelligence.analysis.ratios as any[];
    const findings = result.intelligence.findings as any[];

    let answer = '';
    const evidence: string[] = [];

    if (q.includes('survive') || q.includes('runway') || q.includes('how long')) {
      answer = `Under base-case assumptions, estimated financial runway is ${s.runwayMonthsBase ?? 'N/A'} months with a 12-month survival estimate of ${s.survivalProbability12m}%. Primary constraint: ${s.primaryConstraint}. This is a probabilistic estimate, not a guarantee.`;
      evidence.push(`Runway ${s.runwayMonthsBase}`, `Survival 12m ${s.survivalProbability12m}%`, `Failure risk ${s.failureRisk}`);
    } else if (q.includes('losing money') || q.includes('loss') || q.includes('profit')) {
      const ni = body.current.incomeStatement.netIncome;
      const ocf = body.current.cashFlow.operatingCashFlow;
      answer = `Reported net income is ${ni}. Operating cash flow is ${ocf}. Health profitability dimension scores ${h.dimensions.profitability}/100. ${
        ni < 0 ? 'The company is reporting net losses.' : 'The company is reporting positive net income.'
      } ${ocf < 0 && ni > 0 ? 'Note the divergence: profitable on an accounting basis but cash-starved operationally — requires investigation of working capital and earnings quality.' : ''}`;
      evidence.push(`Net income ${ni}`, `OCF ${ocf}`, `Profitability score ${h.dimensions.profitability}`);
    } else if (q.includes('cash') || q.includes('liquidity')) {
      const cr = ratios.find((r) => r.name === 'Current Ratio');
      answer = `Cash on the balance sheet is ${body.current.balanceSheet.cash}. Current ratio ${cr?.value?.toFixed?.(2) ?? 'N/A'} (${cr?.riskLevel ?? 'n/a'}). Liquidity dimension ${h.dimensions.liquidity}/100. ${s.primaryConstraint}.`;
      evidence.push(`Cash ${body.current.balanceSheet.cash}`, `Current ratio ${cr?.value}`, `Liquidity score ${h.dimensions.liquidity}`);
    } else if (q.includes('debt') || q.includes('leverage') || q.includes('overleveraged')) {
      const de = ratios.find((r) => r.name === 'Debt-to-Equity');
      answer = `Debt-to-equity is ${de?.value?.toFixed?.(2) ?? 'N/A'} (risk ${de?.riskLevel ?? 'n/a'}). Solvency dimension ${h.dimensions.solvency}/100. ${
        (de?.value ?? 0) > 2 ? 'Leverage appears elevated relative to internal thresholds — review debt service and covenants.' : 'Leverage does not appear extreme on the available ratios alone.'
      }`;
      evidence.push(`D/E ${de?.value}`, `Solvency ${h.dimensions.solvency}`);
    } else if (q.includes('cut') || q.includes('expense') || q.includes('this month') || q.includes('should management')) {
      const top = result.intelligence.recommendations?.[0];
      answer = top
        ? `Highest priority action: ${top.action} (Owner: ${top.owner}). Problem addressed: ${top.problem}.`
        : `Focus on cash visibility and the items flagged by the panel (${findings.length} findings).`;
      evidence.push(...(result.intelligence.recommendations || []).slice(0, 3).map((r: any) => r.problem));
    } else if (q.includes('worry') || q.includes('risk') || q.includes('most')) {
      const top = findings[0];
      answer = top
        ? `The panel's leading concern is "${top.title}" (${top.severity}): ${top.finding}`
        : `Overall health is ${h.overallScore}/100 (${h.classification}). Review the full ratio and survival analysis.`;
      evidence.push(...findings.slice(0, 3).map((f: any) => f.title));
    } else {
      answer = `Financial health is ${h.overallScore}/100 (${h.classification.replace(/_/g, ' ')}). 12-month survival estimate ${s.survivalProbability12m}%, failure risk ${s.failureRisk}. Ask about cash, debt, losses, runway, or recommended actions for a focused answer grounded in the uploaded profile.`;
      evidence.push(`Health ${h.overallScore}`, `Survival ${s.survivalProbability12m}%`);
    }

    res.json({
      question: body.question,
      answer,
      evidence,
      confidence: s.confidence,
      dataQuality: result.dataQualityScore,
      disclaimer:
        'Responses are analytical and evidence-based on the provided statements. They do not constitute professional advice or guaranteed predictions.',
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
