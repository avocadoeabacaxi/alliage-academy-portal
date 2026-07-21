import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { action, query, placeId, language = 'pt-BR' } = await req.json();
    const headers = { 'User-Agent': 'AlliageTrainingPortal/1.0', 'Accept-Language': language };
    if (action === 'search') {
      if (!query || query.trim().length < 3) return Response.json({ suggestions: [] });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query.trim())}`, { headers });
      if (!response.ok) throw new Error(`OpenStreetMap: ${response.status}`);
      const results = await response.json();
      return Response.json({ suggestions: results.map((item) => ({ placeId: `${item.osm_type.charAt(0).toUpperCase()}${item.osm_id}`, text: item.display_name })) });
    }
    if (action === 'details' && placeId) {
      const response = await fetch(`https://nominatim.openstreetmap.org/lookup?format=jsonv2&addressdetails=1&osm_ids=${encodeURIComponent(placeId)}`, { headers });
      if (!response.ok) throw new Error(`OpenStreetMap: ${response.status}`);
      const results = await response.json();
      if (!results?.[0]) throw new Error('Address not found');
      const place = results[0];
      const parts = place.address || {};
      return Response.json({ address: { location_place_id: placeId, location_formatted_address: place.display_name || '', location_country: parts.country || '', location_city: parts.city || parts.town || parts.village || parts.municipality || '', location_postal_code: parts.postcode || '', location_street: parts.road || parts.pedestrian || '', location_number: parts.house_number || '', location_specific: parts.suburb || parts.neighbourhood || parts.city_district || '' } });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});