import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    // Support entity-automation payload ({ event, data, old_data }) and direct calls
    let record = body?.event ? (body.data || await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id)) : body;
    if (body?.event) {
      if (record?.status !== 'Rejeitado' || body?.old_data?.status === 'Rejeitado') {
        return Response.json({ skipped: true, reason: 'status not newly rejected' });
      }
    }
    const { request_id, requester_email, requester_name, product_name } = record || {};
    if (!requester_email) return Response.json({ error: 'No requester email' }, { status: 400 });
    const rawReason = record?.rejection_reason;
    const rejection_reason = (rawReason && typeof rawReason === 'object') ? (rawReason.pt || rawReason.en || rawReason.es || '') : (rawReason || '');

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: 'no-reply@training.alliage.global',
      to: requester_email,
      subject: `Solicitação não foi aprovada - ${request_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B5C;">Informação sobre sua Solicitação</h2>
          <p>Olá ${requester_name},</p>
          <p>Informamos que sua solicitação de treinamento foi <strong>rejeitada</strong> neste momento.</p>
          <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Solicitação:</strong> ${request_id}</p>
            <p><strong>Produto:</strong> ${product_name}</p>
            ${rejection_reason ? `<p><strong>Motivo:</strong> ${rejection_reason}</p>` : ''}
          </div>
          <p>Você pode submeter uma nova solicitação assim que tiver informações atualizadas.</p>
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