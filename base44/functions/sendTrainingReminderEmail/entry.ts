import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { request_id, requester_email, requester_name, product_name, training_scheduled_date, location_city, format } = await req.json();

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const dateFormatted = new Date(training_scheduled_date).toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const result = await resend.emails.send({
      from: 'no-reply@training.alliage.global',
      to: requester_email,
      subject: `📅 Lembrete: Seu Treinamento é Amanhã!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00A6D6;">Lembrete: Seu Treinamento é Amanhã!</h2>
          <p>Olá ${requester_name},</p>
          <p>Este é um lembrete de que você tem um treinamento agendado para <strong>amanhã</strong>. Não se esqueça!</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Solicitação:</strong> ${request_id}</p>
            <p><strong>Produto:</strong> ${product_name}</p>
            <p><strong>Data e Hora:</strong> ${dateFormatted}</p>
            <p><strong>Formato:</strong> ${format === 'Remoto' ? 'Online' : 'Presencial'}</p>
            ${location_city && format === 'Presencial' ? `<p><strong>Local:</strong> ${location_city}</p>` : ''}
          </div>
          <p style="font-weight: bold; color: #003B5C;">Por favor, confirme sua presença e chegue com antecedência!</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Dúvidas? Entre em contato conosco.
          </p>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json({ success: true, email_id: result.data.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});