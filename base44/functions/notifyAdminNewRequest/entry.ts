import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();

    // Support both entity-automation payload ({ event, data }) and direct calls
    let record = body?.data || null;
    if (!record && body?.event?.entity_id) {
      record = await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id);
    }
    if (!record && body?.request_id) {
      record = body; // direct invoke with fields
    }
    if (!record) {
      return Response.json({ error: 'No request data' }, { status: 400 });
    }

    const {
      request_id, requester_name, requester_email, product_name,
      region, priority, request_category, request_type, product_category,
    } = record;

    // Resolve internal record id for the detail page link
    let recordId = record.id || body?.event?.entity_id || null;
    if (!recordId && request_id) {
      const found = await base44.asServiceRole.entities.TrainingRequest.filter({ request_id });
      if (found && found.length > 0) recordId = found[0].id;
    }
    const APP_URL = 'https://trainning.alliage.global';
    const reviewUrl = recordId ? `${APP_URL}/requests/${recordId}` : `${APP_URL}/requests`;

    // Resolve recipients via routing rules
    const isEvent = request_category === 'Evento';
    const ruleType = isEvent ? 'Evento' : request_type;

    let recipientEmails: string[] = [];
    if (ruleType) {
      const rules = await base44.asServiceRole.entities.RoutingRule.filter({ request_type: ruleType });
      // Exact product match first, then wildcard/all-products
      const exact = rules.find(r => (r.product_category || '*') === (product_category || '*') && r.product_category && r.product_category !== '*');
      const wildcard = rules.find(r => !r.product_category || r.product_category === '*');
      const matched = exact || wildcard;
      if (matched && matched.recipient_emails && matched.recipient_emails.length > 0) {
        recipientEmails = matched.recipient_emails;
      }
    }

    // Fallback: all admins
    if (recipientEmails.length === 0) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      recipientEmails = (admins || []).map(a => a.email).filter(Boolean);
    }

    // Caio é o aprovador final da 2ª etapa — sempre recebe o pedido
    const FINAL_APPROVER_EMAIL = 'caio.monteiro@alliage-global.com';
    if (!recipientEmails.includes(FINAL_APPROVER_EMAIL)) {
      recipientEmails.push(FINAL_APPROVER_EMAIL);
    }

    // Fernando é o dev — nunca recebe solicitações
    const EXCLUDED_EMAILS = ['fernando@avocado.buzz'];
    recipientEmails = recipientEmails.filter(e => !EXCLUDED_EMAILS.includes(e));

    if (recipientEmails.length === 0) {
      return Response.json({ error: 'No recipients found' }, { status: 404 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: 'no-reply@trainning.alliage.global',
      to: recipientEmails,
      subject: `[${priority || 'Nova'}] Nova Solicitação - ${request_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B5C;">Nova Solicitação${isEvent ? ' de Evento' : ' de Treinamento'}</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ID:</strong> ${request_id}</p>
            <p><strong>Solicitante:</strong> ${requester_name}</p>
            <p><strong>Email:</strong> ${requester_email}</p>
            <p><strong>Tipo:</strong> ${isEvent ? 'Evento' : (request_type || '—')}</p>
            <p><strong>Produto:</strong> ${product_name || product_category || '—'}</p>
            <p><strong>Região:</strong> ${region || '—'}</p>
            <p><strong>Prioridade:</strong> ${priority || '—'}</p>
          </div>
          <p>
            <a href="${reviewUrl}" style="display: inline-block; padding: 12px 24px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">
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

    return Response.json({ success: true, email_id: result.data.id, recipients: recipientEmails });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});