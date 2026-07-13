import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Data de amanhã (YYYY-MM-DD) — lembrete enviado 24h antes
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const targetDate = tomorrow.toISOString().split('T')[0];

    // Treinamentos agendados para amanhã que ainda não tiveram lembrete enviado
    const requests = await base44.asServiceRole.entities.TrainingRequest.filter({
      training_scheduled_date: targetDate,
    });

    const toRemind = (requests || []).filter(
      (r) => !r.reminder_sent && Array.isArray(r.participants_list) && r.participants_list.length > 0
    );

    if (toRemind.length === 0) {
      return Response.json({ success: true, message: 'Nenhum treinamento para notificar', date: targetDate });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const origin = new URL(req.url).origin;
    let totalSent = 0;

    for (const r of toRemind) {
      const productName = r.product_name || '—';
      const recipients = r.participants_list
        .filter((p) => p && p.email && p.email.includes('@'))
        .map((p) => p.email);

      if (recipients.length === 0) continue;

      const locationLine = [r.location_specific, r.location_city, r.location_country]
        .filter(Boolean)
        .join(', ');

      const result = await resend.emails.send({
        from: 'no-reply@trainning.alliage.global',
        to: recipients,
        subject: `Lembrete: seu treinamento é amanhã — ${productName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #003B5C;">Seu treinamento é amanhã!</h2>
            <p>Olá! Este é um lembrete de que você tem um treinamento agendado para amanhã.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Produto/Tema:</strong> ${productName}</p>
              <p><strong>Data:</strong> ${targetDate}</p>
              <p><strong>Formato:</strong> ${r.format || '—'}</p>
              ${locationLine ? `<p><strong>Local:</strong> ${locationLine}</p>` : ''}
            </div>
            <p>Contamos com a sua presença!</p>
          </div>
        `,
      });

      if (!result.error) {
        totalSent += recipients.length;
        await base44.asServiceRole.entities.TrainingRequest.update(r.id, { reminder_sent: true });
      } else {
        console.error('Resend error for request', r.id, result.error);
      }
    }

    return Response.json({ success: true, trainings_notified: toRemind.length, emails_sent: totalSent, date: targetDate });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});