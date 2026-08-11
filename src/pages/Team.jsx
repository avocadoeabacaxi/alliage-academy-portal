import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import DirectoryPage from '@/components/directory/DirectoryPage';
import { directoryLabels, teamCopy } from '@/lib/directoryLabels';

export default function Team() {
  const { lang } = useLanguage();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);
  if (!user) return null;
  const copy = teamCopy[lang] || teamCopy.pt;
  const fields = [{ key: 'name', label: copy.name, required: true }, { key: 'email', label: copy.email, type: 'email', required: true }, { key: 'phone', label: copy.phone }, { key: 'position', label: copy.position }, { key: 'region', label: copy.region, options: ['Brasil', 'LATAM', 'USA', 'ROW'], defaultValue: user.region || 'Brasil' }];
  return <DirectoryPage user={user} entityName="TeamMember" title={copy.title} subtitle={copy.subtitle} fields={fields} primaryKey="name" secondaryKeys={['position', 'email', 'region']} labels={directoryLabels(lang)} />;
}