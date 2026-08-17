/**
 * HTML report suitable for print / PDF conversion (browser print or Puppeteer).
 */

import type { FullReportInput } from './reportBuilder';
import { buildReportSections } from './reportBuilder';

export function reportToHtml(input: FullReportInput): string {
  const sections = buildReportSections(input);
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const sectionHtml = sections
    .map((s) => {
      let html = `<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2><pre class="body">${esc(s.body)}</pre>`;
      if (s.tables) {
        for (const t of s.tables) {
          html += '<table><thead><tr>' + t.headers.map((h) => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>';
          for (const row of t.rows) {
            html += '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>';
          }
          html += '</tbody></table>';
        }
      }
      html += '</section>';
      return html;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>CINTEXA Nexus Finance — ${esc(input.companyName)} — ${esc(input.periodLabel)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 900px; margin: 40px auto; padding: 0 24px; line-height: 1.45; }
    h1 { font-size: 22px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 28px; color: #1e3a5f; }
    .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
    .confidential { color: #b91c1c; font-weight: bold; font-size: 12px; text-transform: uppercase; }
    pre.body { white-space: pre-wrap; font-family: inherit; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    footer { margin-top: 40px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <p class="confidential">Confidential — AI-assisted analytical report</p>
  <h1>CINTEXA Nexus Finance — Financial Diagnostic</h1>
  <p class="meta"><strong>${esc(input.companyName)}</strong> · ${esc(input.periodLabel)} · Generated ${esc(input.generatedAt || new Date().toISOString())} · Data quality ${input.dataQuality}%</p>
  ${sectionHtml}
  <footer>${esc(input.disclaimer)}</footer>
</body>
</html>`;
}
