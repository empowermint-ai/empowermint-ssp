interface SubjectCount {
  name: string;
  count: number;
}

interface UpcomingExam {
  name: string;
  daysUntil: number;
}

export function buildWeeklyDigestEmail({
  studentName,
  rangeLabel,
  completedCount,
  plannedCount,
  subjectBreakdown,
  upcomingExams,
  unsubscribeUrl,
  logoUrl,
}: {
  studentName: string;
  rangeLabel: string;
  completedCount: number;
  plannedCount: number;
  subjectBreakdown: SubjectCount[];
  upcomingExams: UpcomingExam[];
  unsubscribeUrl: string;
  logoUrl: string;
}): string {
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

  const subjectRows = subjectBreakdown
    .map(
      (s) => `
        <tr>
          <td style="padding:6px 0; font-family:${font}; font-size:14px; color:#1a1917;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:3px; background:#0A7968; margin-right:10px;"></span>
            ${escapeHtml(s.name)}
          </td>
          <td align="right" style="padding:6px 0; font-family:${font}; font-size:14px; color:#4a473f;">
            ${s.count} session${s.count === 1 ? '' : 's'}
          </td>
        </tr>`
    )
    .join('');

  const examRows = upcomingExams
    .map(
      (e) => `
        <tr>
          <td style="padding:6px 0; font-family:${font}; font-size:14px; color:#1a1917;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:3px; background:#F37021; margin-right:10px;"></span>
            ${escapeHtml(e.name)}
          </td>
          <td align="right" style="padding:6px 0; font-family:${font}; font-size:14px; color:#4a473f;">
            ${e.daysUntil === 0 ? 'today' : e.daysUntil === 1 ? 'tomorrow' : `in ${e.daysUntil} days`}
          </td>
        </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:#F1EFE7;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F1EFE7; padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px; background:#FFFFFF; border-radius:14px; overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 8px 28px; text-align:center;">
                <img src="${logoUrl}" alt="empowermint" width="72" style="display:block; margin:0 auto 20px auto;" />
                <p style="margin:0; font-family:${font}; font-size:11px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#0A7968;">
                  Weekly study update
                </p>
                <h1 style="margin:6px 0 2px 0; font-family:${font}; font-size:19px; font-weight:800; color:#000000;">
                  ${escapeHtml(studentName)}
                </h1>
                <p style="margin:0; font-family:${font}; font-size:12px; color:#8A8579;">
                  ${escapeHtml(rangeLabel)}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 28px 4px 28px; text-align:center;">
                <p style="margin:0; font-family:${font}; font-size:32px; font-weight:800; color:#163460;">
                  ${completedCount} of ${plannedCount}
                </p>
                <p style="margin:2px 0 0 0; font-family:${font}; font-size:13px; color:#4a473f;">
                  study sessions completed this week
                </p>
              </td>
            </tr>

            ${
              subjectBreakdown.length > 0
                ? `
            <tr>
              <td style="padding:20px 28px 0 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${subjectRows}
                </table>
              </td>
            </tr>`
                : ''
            }

            ${
              upcomingExams.length > 0
                ? `
            <tr>
              <td style="padding:20px 28px 0 28px;">
                <p style="margin:0 0 6px 0; font-family:${font}; font-size:11px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#8A8579;">
                  Coming up
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${examRows}
                </table>
              </td>
            </tr>`
                : ''
            }

            <tr>
              <td style="padding:24px 28px 28px 28px;">
                <p style="margin:0; font-family:${font}; font-size:12px; font-style:italic; color:#8A8579; text-align:center;">
                  This is an automatic summary from empowermint — ${escapeHtml(studentName)} owns their own plan day to day.
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;">
            <tr>
              <td style="padding:16px 12px; text-align:center;">
                <p style="margin:0; font-family:${font}; font-size:11px; color:#8A8579;">
                  Sent by empowermint ·
                  <a href="${unsubscribeUrl}" style="color:#8A8579; text-decoration:underline;">Unsubscribe from these emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildWeeklyDigestEmailText({
  studentName,
  rangeLabel,
  completedCount,
  plannedCount,
  subjectBreakdown,
  upcomingExams,
  unsubscribeUrl,
}: {
  studentName: string;
  rangeLabel: string;
  completedCount: number;
  plannedCount: number;
  subjectBreakdown: SubjectCount[];
  upcomingExams: UpcomingExam[];
  unsubscribeUrl: string;
}): string {
  const lines = [
    `Weekly study update - ${studentName}`,
    rangeLabel,
    '',
    `${completedCount} of ${plannedCount} study sessions completed this week`,
  ];

  if (subjectBreakdown.length > 0) {
    lines.push('', ...subjectBreakdown.map((s) => `- ${s.name}: ${s.count} session${s.count === 1 ? '' : 's'}`));
  }

  if (upcomingExams.length > 0) {
    lines.push(
      '',
      'Coming up:',
      ...upcomingExams.map(
        (e) => `- ${e.name} ${e.daysUntil === 0 ? 'today' : e.daysUntil === 1 ? 'tomorrow' : `in ${e.daysUntil} days`}`
      )
    );
  }

  lines.push(
    '',
    `This is an automatic summary from empowermint - ${studentName} owns their own plan day to day.`,
    '',
    `Unsubscribe from these emails: ${unsubscribeUrl}`
  );

  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
