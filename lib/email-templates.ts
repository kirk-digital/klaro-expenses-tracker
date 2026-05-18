export function expenseSubmittedEmail({
  approverName,
  submitterName,
  merchant,
  amount,
  orgName,
  expenseUrl,
}: {
  approverName: string;
  submitterName: string;
  merchant: string;
  amount: string;
  orgName: string;
  expenseUrl: string;
}) {
  return {
    subject: `New expense awaiting approval — ${merchant}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#0F2057;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <span style="color:#22D3EE;font-weight:700;font-size:18px;">Expenses Tracker</span>
        </div>
        <p style="color:#1e293b;font-size:15px;">Hi ${approverName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          <strong>${submitterName}</strong> has submitted a new expense for approval in
          <strong>${orgName}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Merchant</td>
            <td style="padding:10px 14px;font-size:14px;color:#1e293b;font-weight:600;">${merchant}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Amount</td>
            <td style="padding:10px 14px;font-size:14px;color:#1e293b;font-weight:600;">${amount}</td>
          </tr>
        </table>
        <a href="${expenseUrl}" style="display:inline-block;background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
          Review expense →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
          You're receiving this because you're an approver at ${orgName}.
        </p>
      </div>
    `,
  };
}

export function expenseApprovedEmail({
  submitterName,
  merchant,
  amount,
  orgName,
  expenseUrl,
}: {
  submitterName: string;
  merchant: string;
  amount: string;
  orgName: string;
  expenseUrl: string;
}) {
  return {
    subject: `Expense approved — ${merchant}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#0F2057;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <span style="color:#22D3EE;font-weight:700;font-size:18px;">Expenses Tracker</span>
        </div>
        <p style="color:#1e293b;font-size:15px;">Hi ${submitterName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your expense for <strong>${merchant}</strong> (${amount}) has been
          <strong style="color:#059669;">approved</strong> in ${orgName}.
        </p>
        <a href="${expenseUrl}" style="display:inline-block;background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-top:8px;">
          View expense →
        </a>
      </div>
    `,
  };
}

export function expenseRejectedEmail({
  submitterName,
  merchant,
  amount,
  orgName,
  expenseUrl,
}: {
  submitterName: string;
  merchant: string;
  amount: string;
  orgName: string;
  expenseUrl: string;
}) {
  return {
    subject: `Expense rejected — ${merchant}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#0F2057;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <span style="color:#22D3EE;font-weight:700;font-size:18px;">Expenses Tracker</span>
        </div>
        <p style="color:#1e293b;font-size:15px;">Hi ${submitterName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your expense for <strong>${merchant}</strong> (${amount}) has been
          <strong style="color:#dc2626;">rejected</strong> in ${orgName}.
        </p>
        <a href="${expenseUrl}" style="display:inline-block;background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-top:8px;">
          View expense →
        </a>
      </div>
    `,
  };
}

export function expenseNeedsRevisionEmail({
  submitterName,
  merchant,
  revisionNote,
  orgName,
  expenseUrl,
}: {
  submitterName: string;
  merchant: string;
  revisionNote: string;
  orgName: string;
  expenseUrl: string;
}) {
  return {
    subject: `Revision requested — ${merchant}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#0F2057;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <span style="color:#22D3EE;font-weight:700;font-size:18px;">Expenses Tracker</span>
        </div>
        <p style="color:#1e293b;font-size:15px;">Hi ${submitterName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your expense for <strong>${merchant}</strong> in ${orgName} has been
          sent back for revision.
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
          <p style="font-size:12px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Revision requested</p>
          <p style="font-size:14px;color:#92400e;margin:0;">${revisionNote}</p>
        </div>
        <a href="${expenseUrl}" style="display:inline-block;background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
          Edit &amp; resubmit →
        </a>
      </div>
    `,
  };
}
