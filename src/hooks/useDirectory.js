import { useCallback, useEffect, useState } from 'react';
import { alliage } from '@/api/alliageClient';

export default function useDirectory(entityName, user) {
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setRecords(await alliage.entities[entityName].list('-created_date', 500)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [entityName, user]);
  useEffect(() => { load(); }, [load]);
  const save = async (values) => {
    setError('');
    try {
      if (editing) await alliage.entities[entityName].update(editing.id, values);
      else await alliage.entities[entityName].create({ ...values, owner_user_id: user.id, owner_name: user.full_name });
      setEditing(null);
      await load();
      return true;
    } catch (e) { setError(e.message); return false; }
  };
  const remove = async (record) => {
    if (!window.confirm('Deseja excluir este cadastro?')) return;
    setError('');
    try {
      await alliage.entities[entityName].delete(record.id);
      await load();
    } catch (e) { setError(e.message); }
  };
  return { records, editing, loading, error, save, remove, setEditing };
}