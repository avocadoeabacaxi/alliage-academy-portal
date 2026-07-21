import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Loader2, MapPin } from 'lucide-react';

export default function AddressFields({ data, update, disabled = false }) {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState(data.location_formatted_address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (disabled || query.trim().length < 3 || query === data.location_formatted_address) return setSuggestions([]);
    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await base44.functions.invoke('googleAddress', { action: 'search', query, language: lang });
      setSuggestions(response.data.suggestions || []);
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, disabled, lang, data.location_formatted_address]);
  const selectAddress = async (place) => {
    setLoading(true);
    const response = await base44.functions.invoke('googleAddress', { action: 'details', placeId: place.placeId, language: lang });
    Object.entries(response.data.address).forEach(([key, value]) => update(key, value));
    setQuery(response.data.address.location_formatted_address);
    setSuggestions([]);
    setLoading(false);
  };
  const input = (key, label, type = 'text') => <div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label><input type={type} disabled={disabled} value={data[key] || ''} onChange={e => update(key, e.target.value)} className="input-base disabled:bg-slate-50" /></div>;
  return <div className="space-y-3"><div className="relative"><label className="block text-sm font-medium text-slate-700 mb-1.5">{t('form.addressSearch')}</label><div className="relative"><MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input disabled={disabled} value={query} onChange={e => setQuery(e.target.value)} className="input-base pl-9" placeholder={t('form.addressSearchPlaceholder')} />{loading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-[#00A6D6]"/>}</div>{suggestions.length > 0 && <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">{suggestions.map(place => <button type="button" key={place.placeId} onClick={() => selectAddress(place)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0">{place.text}</button>)}</div>}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{input('location_country', t('form.locationCountry'))}{input('location_city', t('form.locationCity'))}{input('location_postal_code', t('form.locationPostalCode'))}{input('location_specific', t('form.locationSpecific'))}{input('location_street', t('form.locationStreet'))}{input('location_number', t('form.locationNumber'))}</div>{input('location_complement', t('form.locationComplement'))}</div>;
}