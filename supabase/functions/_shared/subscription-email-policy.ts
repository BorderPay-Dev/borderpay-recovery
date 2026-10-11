import {maintenanceDates} from './maintenance-calendar.ts';
export function prepareInvoiceEmail(job: any, invoice: any, subscription: any, now = new Date()) {
  const suppress = (reason: string) => ({ action: 'suppress' as const, reason });
  if (!invoice || invoice.user_id !== job.user_id || invoice.provider_reference !== job.props?.transaction_reference) return suppress('invoice_not_found_for_owner');
  if (invoice.status !== 'payment_link_created' || invoice.paid_at || !invoice.payment_link) return suppress('invoice_not_payable');
  if (!subscription || subscription.user_id !== job.user_id || subscription.status !== 'active') return suppress('subscription_not_active');
  const due = Date.parse(`${invoice.billing_period}T00:00:00Z`);
  if (!Number.isFinite(due)) return suppress('invalid_invoice_date');
  const notice = String(job.props?.notice || 'invoice');
  if (!['invoice', 'reminder', 'final_warning', 'balance_reminder', 'deactivated'].includes(notice)) return suppress('unsupported_notice');
  if (job.props?.deactivation_date) {
    const warningDate = String(job.props.deactivation_date);
    if (notice !== 'balance_reminder' || !/^\d{4}-\d{2}-\d{2}$/.test(warningDate) || warningDate !== now.toISOString().slice(0, 10) || due > now.getTime()) return suppress('deactivation_warning_not_due_today');
  }
  if(invoice.expires_at && Date.parse(invoice.expires_at)<=now.getTime())return suppress('invoice_link_expired');
  const business=subscription.account_type==='business';
  const dates=maintenanceDates(invoice.billing_period);
  const rawGrace = subscription.grace_started_at ? Date.parse(subscription.grace_started_at) : due;
  if (!Number.isFinite(rawGrace)) return suppress('invalid_grace_date');
  const grace = business ? dates.graceStart : Math.max(rawGrace, due);
  const deadline = business ? dates.deadline : new Date(grace + 7 * 86400000).toISOString().slice(0, 10);
  if (notice === 'balance_reminder' && now.getTime() < due) return { action: 'defer' as const, nextAttemptAt: new Date(due).toISOString() };
  if(notice==='deactivated' && (!business || !job.props?.deactivated_currencies?.length))return suppress('deactivation_not_confirmed');
  if (notice !== 'invoice' && notice !== 'balance_reminder' && notice !== 'deactivated') {
    const eligibleAt = business ? (notice==='reminder' ? dates.reminderAt : dates.finalWarningAt) : grace + (notice === 'reminder' ? 3 : 7) * 86400000;
    if (now.getTime() < eligibleAt) return { action: 'defer' as const, nextAttemptAt: new Date(eligibleAt).toISOString() };
  }
  return { action: 'send' as const, props: { ...job.props, amount: Number(invoice.amount), currency: invoice.currency,
    billing_period: invoice.billing_period, payment_link: invoice.payment_link, transaction_reference: invoice.provider_reference,
    ...(business || (notice !== 'invoice' && notice !== 'balance_reminder') ? { deadline } : {}) } };
}

export function confirmedEmailDelivery(responseOk: boolean, payload: any): boolean {
  return responseOk && payload?.success === true && payload?.data?.status === 'sent';
}
