const DAY = 86_400_000;
export function maintenanceDates(period: string) {
  const due = Date.parse(period + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period) || !Number.isFinite(due) || new Date(due).toISOString().slice(0,10)!==period) throw Error('Invalid billing period');
  const date = new Date(due);
  if (new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getTime()!==due) throw Error('Billing period must end on the last calendar day');
  return { dueAt: due, graceStart: due+DAY, reminderAt: due+4*DAY, finalWarningAt: due+7*DAY, deactivateAt: due+8*DAY,
    deadline: new Date(due+7*DAY).toISOString().slice(0,10) };
}
export function verifiedUnpaid(result: any): boolean {
  if (result?.status === 'unresolved') return result.error === 'flutterwave_request_failed:400:No transaction was found for this id';
  return ['failed','cancelled'].includes(result?.status);
}
export function maintenanceNotice(period: string, now = Date.now()) {
  const d=maintenanceDates(period);
  if(now<d.dueAt)return null;
  if(now>=d.finalWarningAt)return 'final_warning';
  if(now>=d.reminderAt)return 'reminder';
  return 'invoice';
}
