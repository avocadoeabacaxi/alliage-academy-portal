import React from 'react';
import { Paperclip, Wrench } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supportCopy } from '@/lib/i18n/supportAndFollowUp';
import { safeSupportLink } from '@/lib/technicalSupport';

export default function TechnicalSupportDetails({ request: req }) {
  const { lang, t } = useLanguage();
  const c = supportCopy(lang);
  const reference = safeSupportLink(req.support_reference_url);
  const row = (label, value) => value ? <div><p className="text-xs text-slate-500 mb-1">{label}</p><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{value}</p></div> : null;
  return <section className="card-modern p-4 mb-3 space-y-3">
    <h2 className="flex gap-2 items-center text-sm font-semibold text-[#003B5C]"><Wrench className="w-4 h-4 text-[#00A6D6]" />{c.details}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{row(c.company, req.company_name)}{row(c.phone, req.requester_phone)}{row(c.model, req.equipment_model)}{row(c.serial, req.equipment_serial)}{row(c.supportSubtype, req.request_type_detail)}</div>
    {row(c.service, req.format === 'Presencial' ? c.onsite : c.remote)}
    {req.format === 'Presencial' && <>{row(c.visit, req.support_visit_mode === 'ribeirao' ? c.ribeirao : c.local)}{req.support_visit_mode !== 'ribeirao' && row(t('form.locationStreet'), [req.location_street, req.location_number, req.location_complement, req.location_specific, req.location_city, req.location_country, req.location_postal_code].filter(Boolean).join(', '))}</>}
    {row(c.notes, req.format_details)}
    {reference && <a href={reference} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#007a9e] underline break-all">{c.video}: {reference}</a>}
    {Array.isArray(req.attachments) && req.attachments.length > 0 && <div><h3 className="text-sm font-medium text-slate-700 mb-2">{c.attachments}</h3><ul className="space-y-2">{req.attachments.map((file, index) => {
      const path = typeof file === 'string' ? file : file?.url;
      const url = typeof path === 'string' && /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/i.test(path) ? path : safeSupportLink(path);
      return url ? <li key={index}><a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#007a9e] underline break-all"><Paperclip className="w-4 h-4 shrink-0" />{file?.name || `${c.attachmentOpen} ${index + 1}`}</a></li> : null;
    })}</ul></div>}
  </section>;
}
