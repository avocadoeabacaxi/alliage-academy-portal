import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const year = new Date().getFullYear();
    const prefix = `TR-${year}-`;

    const requests = await base44.asServiceRole.entities.TrainingRequest.list('-request_id', 1000);

    let maxNum = 0;
    for (const r of requests) {
      if (r.request_id && r.request_id.startsWith(prefix)) {
        const num = parseInt(r.request_id.split('-')[2]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    const newId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
    return Response.json({ request_id: newId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});