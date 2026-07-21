import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { action, query, placeId, language = 'pt-BR' } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (action === 'search') {
      if (!query || query.trim().length < 3) return Response.json({ suggestions: [] });
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query.trim())}&language=${encodeURIComponent(language)}&key=${apiKey}`);
      const data = await response.json();
      if (!response.ok || data.status !== 'OK') throw new Error(`Google Geocoding: ${data.status || response.status}`);
      return Response.json({ suggestions: (data.results || []).slice(0, 5).map((item) => ({ placeId: item.place_id, text: item.formatted_address })) });
    }
    if (action === 'details' && placeId) {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&language=${encodeURIComponent(language)}&key=${apiKey}`);
      const data = await response.json();
      if (!response.ok || data.status !== 'OK' || !data.results?.[0]) throw new Error(`Google Geocoding: ${data.status || response.status}`);
      const place = data.results[0];
      const parts = Object.fromEntries((place.address_components || []).flatMap((part) => (part.types || []).map((type) => [type, part.long_name])));
      return Response.json({ address: { location_place_id: place.place_id, location_formatted_address: place.formatted_address || '', location_country: parts.country || '', location_city: parts.locality || parts.administrative_area_level_2 || '', location_postal_code: parts.postal_code || '', location_street: parts.route || '', location_number: parts.street_number || '', location_specific: parts.sublocality || parts.neighborhood || '' } });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});