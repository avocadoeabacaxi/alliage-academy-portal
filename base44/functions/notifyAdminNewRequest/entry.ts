import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { request_id, requester_name, requester_email, product_name, region, priority } = await req.json();

    // Get admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (!admins || admins.length === 0) {
      return Response.json({ error: 'No admins found' }, { status: 404 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const adminEmails = admins.map(a => a.email);

    const result = await resend.emails.send({
      from: 'no-reply@trainning.alliage.global',
      to: adminEmails,
      subject: `[${priority}] Nova Solicitação de Treinamento - ${request_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B5C;">Nova Solicitação de Treinamento</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ID:</strong> ${request_id}</p>
            <p><strong>Solicitante:</strong> ${requester_name}</p>
            <p><strong>Email:</strong> ${requester_email}</p>
            <p><strong>Produto:</strong> ${product_name}</p>
            <p><strong>Região:</strong> ${region}</p>
            <p><strong>Prioridade:</strong> ${priority}</p>
          </div>
          <p>
            <a href="${new URL(req.url).origin}/requests/${request_id}" style="display: inline-block; padding: 12px 24px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">
              Revisar Solicitação
            </a>
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