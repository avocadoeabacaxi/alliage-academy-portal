import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REGION_SIGLAS = {
  'Brasil': 'BR',
  'LATAM': 'LT',
  'USA': 'US',
  'ROW': 'RW'
};

const COMPANY_SIGLAS = {
  'Filial Alliage': 'FIL',
  'Distribuidor/Dealer': 'DIS',
  'Cliente Final': 'CLI',
  'Outro': 'OUT'
};

const AREA_SIGLAS = {
  'Comercial': 'COM',
  'Aplicação Clínica': 'APL',
  'Educação': 'EDU',
  'Marketing': 'MKT',
  'Pós-vendas': 'POS',
  'Outro': 'OUT'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const region = REGION_SIGLAS[body.region] || 'XX';
    const company = COMPANY_SIGLAS[body.company_type] || 'XX';
    const area = AREA_SIGLAS[body.area] || 'XX';

    const year = new Date().getFullYear();
    const yearPrefix = `TR-${year}-`;

    const requests = await base44.asServiceRole.entities.TrainingRequest.list('-request_id', 1000);

    let maxNum = 0;
    for (const r of requests) {
      if (r.request_id && r.request_id.startsWith(yearPrefix)) {
        const parts = r.request_id.split('-');
        const num = parseInt(parts[parts.length - 1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    const newId = `${yearPrefix}${region}-${company}-${area}-${String(maxNum + 1).padStart(3, '0')}`;
    return Response.json({ request_id: newId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});