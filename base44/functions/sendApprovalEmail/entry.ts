import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { request_id, requester_email, requester_name, product_name, training_scheduled_date, educator_name } = await req.json();

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const dateFormatted = training_scheduled_date 
      ? new Date(training_scheduled_date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'A ser agendada';

    const result = await resend.emails.send({
      from: 'training@alliageacademy.com',
      to: requester_email,
      subject: `✅ Solicitação Aprovada - ${request_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00A6D6;">Sua Solicitação foi Aprovada!</h2>
          <p>Olá ${requester_name},</p>
          <p>Temos o prazer de informar que sua solicitação de treinamento foi <strong>aprovada</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Solicitação:</strong> ${request_id}</p>
            <p><strong>Produto:</strong> ${product_name}</p>
            ${educator_name ? `<p><strong>Educador:</strong> ${educator_name}</p>` : ''}
            <p><strong>Data do Treinamento:</strong> ${dateFormatted}</p>
          </div>
          <p>Em breve você receberá mais detalhes sobre o treinamento. Fique atento aos seus emails!</p>
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