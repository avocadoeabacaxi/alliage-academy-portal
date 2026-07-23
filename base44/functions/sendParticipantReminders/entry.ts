import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const targetDate = tomorrow.toISOString().split('T')[0];
    const [trainings, events] = await Promise.all([
      base44.asServiceRole.entities.TrainingRequest.filter({ training_scheduled_date: targetDate }),
      base44.asServiceRole.entities.TrainingRequest.filter({ event_start_date: targetDate }),
    ]);
    const requests = [...new Map([...(trainings || []), ...(events || [])].map((item) => [item.id, item])).values()];
    const toRemind = requests.filter(
      (item) => item.status !== 'Cancelado' && !item.reminder_sent && Array.isArray(item.participants_list) && item.participants_list.length > 0,
    );

    if (toRemind.length === 0) {
      return Response.json({ success: true, message: 'Nenhum treinamento para notificar', date: targetDate });
    }

    if (payload.dry_run === true) {
      return Response.json({ success: true, dry_run: true, trainings_to_notify: toRemind.length, date: targetDate });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    let totalSent = 0;

    for (const training of toRemind) {
      const participants = training.participants_list.filter((participant) => participant?.email?.includes('@'));
      if (participants.length === 0) continue;

      const productName = training.product_name || 'Treinamento Alliage';
      const streetAddress = [training.location_street, training.location_number].filter(Boolean).join(', ');
      const cityAddress = [training.location_specific, training.location_city, training.location_postal_code].filter(Boolean).join(', ');
      const location = streetAddress
        ? [streetAddress, training.location_complement, cityAddress, training.location_country].filter(Boolean).join(' — ')
        : training.location_formatted_address || [cityAddress, training.location_country].filter(Boolean).join(' — ');
      const roomLink = training.online_access_link || (training.format_details || '').match(/https?:\/\/[^\s<]+/i)?.[0] || '';
      const scheduledDate = training.training_scheduled_date || training.event_start_date || targetDate;
      const finalDate = training.event_end_date || scheduledDate;
      const end = new Date(`${finalDate}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      const startCompact = scheduledDate.replaceAll('-', '');
      const endCompact = end.toISOString().slice(0, 10).replaceAll('-', '');
      let sentForRequest = 0;

      for (const participant of participants) {
        const attendanceMode = participant.attendance_mode || training.guest_participation_mode || 'Presencial';
        const includesLocation = attendanceMode !== 'Online';
        const includesOnline = attendanceMode !== 'Presencial';
        const accessDetails = [
          includesLocation && location ? `Local: ${location}` : '',
          includesOnline && roomLink ? `Acesse a sala: ${roomLink}` : '',
        ].filter(Boolean).join(' | ');
        const calendarLocation = includesLocation && location ? location : includesOnline ? roomLink : '';
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(productName)}&dates=${startCompact}/${endCompact}&details=${encodeURIComponent(accessDetails)}&location=${encodeURIComponent(calendarLocation)}`;
        const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(productName)}&startdt=${scheduledDate}T00%3A00%3A00&enddt=${end.toISOString().slice(0, 10)}T00%3A00%3A00&body=${encodeURIComponent(accessDetails)}&location=${encodeURIComponent(calendarLocation)}`;
        const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Alliage//Training//PT\r\nBEGIN:VEVENT\r\nUID:${training.id}-${participant.email}@alliage.global\r\nDTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z\r\nDTSTART;VALUE=DATE:${startCompact}\r\nDTEND;VALUE=DATE:${endCompact}\r\nSUMMARY:${productName}\r\nLOCATION:${calendarLocation}\r\nDESCRIPTION:${accessDetails}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
        const locationHtml = includesLocation && location ? `<p><strong>Endereço:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}">${location}</a></p>` : '';
        const linkHtml = includesOnline && roomLink ? `<p><strong>${training.online_platform || 'Sala de treinamento'}:</strong> <a href="${roomLink}">Acessar sala</a></p>` : includesOnline && training.needs_educator_link ? '<p><strong>Link online:</strong> será enviado pelo educador responsável.</p>' : '';
        const result = await resend.emails.send({
          from: 'no-reply@trainning.alliage.global',
          to: participant.email,
          subject: `Lembrete: sua atividade é amanhã — ${productName}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Sua atividade é amanhã!</h2><p>Olá, ${participant.name || 'participante'}! Este é um lembrete da sua atividade agendada para amanhã.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><p><strong>Produto/Tema:</strong> ${productName}</p><p><strong>Data:</strong> ${scheduledDate}${training.event_end_date && training.event_end_date !== scheduledDate ? ` a ${training.event_end_date}` : ''}</p><p><strong>Sua participação:</strong> ${attendanceMode}</p>${locationHtml}${linkHtml}</div><p style="margin:24px 0"><a href="${googleCalendarUrl}" style="display:inline-block;padding:10px 16px;background:#00A6D6;color:#fff;text-decoration:none;border-radius:20px;margin-right:8px">Google Calendar</a><a href="${outlookUrl}" style="display:inline-block;padding:10px 16px;background:#003B5C;color:#fff;text-decoration:none;border-radius:20px">Outlook Calendar</a></p><p>Para Apple Calendar, abra o arquivo de calendário anexado a este e-mail.</p><p>Contamos com a sua presença!</p></div>`,
          attachments: [{ filename: 'atividade-alliage.ics', content: btoa(unescape(encodeURIComponent(ics))) }],
        });
        if (!result.error) {
          totalSent += 1;
          sentForRequest += 1;
        } else {
          console.error('Resend error for participant', participant.email, result.error);
        }
      }

      if (sentForRequest === participants.length) {
        await base44.asServiceRole.entities.TrainingRequest.update(training.id, { reminder_sent: true });
      }
    }

    return Response.json({ success: true, trainings_notified: toRemind.length, emails_sent: totalSent, date: targetDate });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});