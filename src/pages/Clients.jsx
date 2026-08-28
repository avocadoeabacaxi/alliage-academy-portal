import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import DirectoryPage from '@/components/directory/DirectoryPage';
import { clientCopy, directoryLabels } from '@/lib/directoryLabels';

export default function Clients() {
  const { lang } = useLanguage();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);
  if (!user) return null;
  const copy = clientCopy[lang] || clientCopy.pt;
  const fields = [{ key: 'name', label: copy.name, required: true, wide: true }, { key: 'contact_name', label: copy.contact }, { key: 'email', label: copy.email, type: 'email', required: true }, { key: 'phone', label: copy.phone, type: 'tel', required: true }, { key: 'region', label: copy.region, options: ['Brasil', 'LATAM', 'USA', 'ROW'], defaultValue: user.region || 'Brasil' }, { key: 'country', label: copy.country }, { key: 'city', label: copy.city }, { key: 'notes', label: copy.notes, multiline: true, wide: true }];
  return <DirectoryPage user={user} entityName="Client" title={copy.title} subtitle={copy.subtitle} fields={fields} primaryKey="name" secondaryKeys={['contact_name', 'email', 'city', 'region']} labels={directoryLabels(lang)} />;
}