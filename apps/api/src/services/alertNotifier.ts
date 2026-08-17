/**
 * Alert notification channels
 * Supports webhook POST when ALERT_WEBHOOK_URL is configured.
 */

export interface NotifiableAlert {
  id: string;
  type: string;
  message: string;
  severity: string;
  companyId?: string;
  companyName?: string;
}

export async function dispatchAlerts(alerts: NotifiableAlert[]): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    return { sent: 0, skipped: alerts.length, errors: [] };
  }

  const high = alerts.filter((a) => ['HIGH', 'SEVERE', 'CRITICAL'].includes(a.severity));
  if (high.length === 0) return { sent: 0, skipped: alerts.length, errors: [] };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'CINTEXA Nexus Finance',
        timestamp: new Date().toISOString(),
        alertCount: high.length,
        alerts: high,
      }),
    });
    if (!res.ok) {
      return { sent: 0, skipped: 0, errors: [`Webhook responded ${res.status}`] };
    }
    return { sent: high.length, skipped: alerts.length - high.length, errors: [] };
  } catch (err: any) {
    return { sent: 0, skipped: 0, errors: [err.message || 'Webhook failed'] };
  }
}
