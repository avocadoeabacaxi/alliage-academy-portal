import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { scheduleConflicts, suggestScheduleSlots, toDateTimeLocal } from '@/lib/trainingSchedule';

export default function useTrainingSchedule(request, labels) {
  const [schedule, setSchedule] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!request.educator_id) return;
    const records = await base44.entities.TrainingSchedule.filter({ training_request_id: request.id });
    const current = records[0] || null;
    setSchedule(current);
    if (current) {
      setStart(toDateTimeLocal(current.start_datetime));
      setEnd(toDateTimeLocal(current.end_datetime));
    }
  }, [request.id, request.educator_id]);

  useEffect(() => { load(); }, [load]);

  const chooseSuggestion = (slot) => {
    setStart(toDateTimeLocal(slot.start));
    setEnd(toDateTimeLocal(slot.end));
    setSuggestions([]);
    setMessage('');
  };

  const save = async () => {
    setMessage('');
    if (!start || !end || new Date(end) <= new Date(start)) {
      setMessage(labels.invalid);
      return;
    }
    setSaving(true);
    try {
      const educatorSchedules = await base44.entities.TrainingSchedule.filter({ educator_id: request.educator_id });
      const others = educatorSchedules.filter((item) => item.id !== schedule?.id);
      const conflicts = scheduleConflicts(start, end, others);
      if (conflicts.length) {
        setSuggestions(suggestScheduleSlots(start, end, others));
        setMessage(labels.conflict);
        return;
      }
      const data = { training_request_id: request.id, request_id_display: request.request_id, educator_id: request.educator_id, educator_name: request.educator_name, start_datetime: new Date(start).toISOString(), end_datetime: new Date(end).toISOString() };
      if (schedule) await base44.entities.TrainingSchedule.update(schedule.id, data);
      else await base44.entities.TrainingSchedule.create(data);
      await base44.entities.TrainingRequest.update(request.id, { training_scheduled_date: start.slice(0, 10) });
      setSuggestions([]);
      setMessage(labels.saved);
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return { schedule, start, end, suggestions, message, saving, setStart, setEnd, chooseSuggestion, save };
}