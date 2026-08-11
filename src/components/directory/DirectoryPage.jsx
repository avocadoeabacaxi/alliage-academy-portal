import React from 'react';
import DirectoryForm from '@/components/directory/DirectoryForm';
import DirectoryList from '@/components/directory/DirectoryList';
import useDirectory from '@/hooks/useDirectory';

export default function DirectoryPage({ user, entityName, title, subtitle, fields, primaryKey, secondaryKeys, labels }) {
  const directory = useDirectory(entityName, user);
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-5"><h1 className="text-2xl font-bold text-[#003B5C]">{title}</h1><p className="text-sm text-slate-500">{subtitle}</p></div>
      {directory.error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{directory.error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DirectoryForm fields={fields} editing={directory.editing} onSave={directory.save} labels={labels} />
        {directory.loading ? <div className="card-modern p-8 text-center text-sm text-slate-400">{labels.loading}</div> : (
          <DirectoryList records={directory.records} primaryKey={primaryKey} secondaryKeys={secondaryKeys} onEdit={directory.setEditing} onDelete={directory.remove} labels={labels} isAdmin={user?.role === 'admin'} />
        )}
      </div>
    </div>
  );
}