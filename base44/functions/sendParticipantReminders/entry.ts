import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, formatDate, normalizeLanguage } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const tomorrow = new Date(Date.now() + 86400000);
    const targetDate = tomorrow.toISOString().split('T')[0];
    const [trainings, events] = await Promise.all([
      base44.asServiceRole.entities.TrainingRequest.filter({ training_scheduled_date: targetDate }),
      base44.asServiceRole.entities.TrainingRequest.filter({ event_start_date: targetDate })
    ]);
    const requests = [...new Map([...(trainings || []), ...(events || [])].map((item) => [item.id, item])).values()];
    const pending = requests.filter((item) => item.status !== 'Cancelado' && !item.reminder_sent && Array.isArray(item.participants_list) && item.participants_list.length);
    if (payload.dry_run === true) return Response.json({ success: true, dry_run: true, trainings_to_notify: pending.length, date: targetDate, from: EMAIL_FROM });
    if (!pending.length) return Response.json({ success: true, emails_sent: 0, date: targetDate });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    let totalSent = 0;
    for (const training of pending) {
      const participants = training.participants_list.filter((participant) => participant?.email?.includes('@'));
      const language = normalizeLanguage(training.original_language);
      const product = training.product_name || 'Alliage Training';
      const street = [training.location_street, training.location_number].filter(Boolean).join(', ');
      const city = [training.location_specific, training.location_city, training.location_postal_code].filter(Boolean).join(', ');
      const location = street ? [street, training.location_complement, city, training.location_country].filter(Boolean).join(' — ') : training.location_formatted_address || [city, training.location_country].filter(Boolean).join(' — ');
      const roomLink = training.online_access_link || (training.format_details || '').match(/https?:\/\/[^\s<]+/i)?.[0] || '';
      const scheduledDate = training.training_scheduled_date || training.event_start_date || targetDate;
      const finalDate = training.event_end_date || scheduledDate;
      const end = new Date(`${finalDate}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      const startCompact = scheduledDate.replaceAll('-', '');
      const endCompact = end.toISOString().slice(0, 10).replaceAll('-', '');
      let sent = 0;
      for (const participant of participants) {
        const attendance = participant.attendance_mode || training.guest_participation_mode || 'Presencial';
        const includeLocation = attendance !== 'Online';
        const includeOnline = attendance !== 'Presencial';
        const calendarLocation = includeLocation && location ? location : includeOnline ? roomLink : '';
        const accessDetails = [includeLocation && location ? location : '', includeOnline && roomLink ? roomLink : ''].filter(Boolean).join(' | ');
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(product)}&dates=${startCompact}/${endCompact}&details=${encodeURIComponent(accessDetails)}&location=${encodeURIComponent(calendarLocation)}`;
        const onlineHtml = includeOnline && roomLink ? `<p><a href="${roomLink}" style="color:#00A6D6;font-weight:bold">${training.online_platform || 'Online'}</a></p>` : '';
        const calendarHtml = `<p style="text-align:center"><a href="${googleUrl}" style="display:inline-block;padding:10px 16px;background:#003B5C;color:#fff;text-decoration:none;border-radius:20px">Google Calendar</a></p>`;
        const message = buildEmail('reminder', language, { name: participant.name, product, date: formatDate(scheduledDate, language), format: attendance, location: includeLocation ? location : '', participation: attendance, accessHtml: onlineHtml + calendarHtml });
        const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Alliage//Training//EN\r\nBEGIN:VEVENT\r\nUID:${training.id}-${participant.email}@alliage.global\r\nDTSTART;VALUE=DATE:${startCompact}\r\nDTEND;VALUE=DATE:${endCompact}\r\nSUMMARY:${product}\r\nLOCATION:${calendarLocation}\r\nDESCRIPTION:${accessDetails}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
        const result = await resend.emails.send({ from: EMAIL_FROM, to: participant.email, ...message, attachments: [{ filename: 'alliage-training.ics', content: btoa(unescape(encodeURIComponent(ics))) }] });
        if (!result.error) { totalSent += 1; sent += 1; }
        else console.error('Resend error:', result.error);
      }
      if (participants.length && sent === participants.length) await base44.asServiceRole.entities.TrainingRequest.update(training.id, { reminder_sent: true });
    }
    return Response.json({ success: true, trainings_notified: pending.length, emails_sent: totalSent, date: targetDate });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}