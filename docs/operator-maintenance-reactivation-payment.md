# Operator-authorized maintenance reactivation payment

Allow a temporary operator-authorized maintenance repayment path for an approved, active customer whose VA was deactivated specifically for subscription_nonpayment. Require existing active custody, no account/provider restriction, no partner/team exemption, a currently active subscription and an unexpired operator authorization stored in subscription metadata. This does not reactivate provider accounts or mark an invoice paid.

The existing completion webhook verifies payment amount/currency and then clears maintenance restrictions. Existing subscription access reconciliation queues reactivation only after payment_status=active.

Validation: transactional rollback rehearsal and committed before/after eligibility assertions confirmed no other merchant's billing eligibility changed. One explicitly requested USD 29.99 invoice was reissued; the branded reminder was accepted by the email provider. No wallet funds were deducted and no provider VA reactivation was executed.
