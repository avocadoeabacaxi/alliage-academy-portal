import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import useTrainingSchedule from '@/hooks/useTrainingSchedule';
import trainingScheduleLabels from '@/lib/trainingScheduleLabels';
import TrainingScheduleForm from '@/components/TrainingScheduleForm';

export default function TrainingScheduler({ request, canEdit }) {
  const { lang } = useLanguage();
  const labels = trainingScheduleLabels(lang);
  const state = useTrainingSchedule(request, labels);
  if (!request.educator_id) return null;

  return (
    <div className="card-modern p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#00A6D6]/10 flex items-center justify-center"><CalendarClock className="w-4 h-4 text-[#00A6D6]" /></div>
        <div>
          <h2 className="text-sm font-semibold text-[#003B5C]">{labels.title}</h2>
          <p className="text-xs text-slate-500">{labels.educator}: {request.educator_name}</p>
        </div>
      </div>
      {canEdit ? <TrainingScheduleForm state={state} labels={labels} /> : state.schedule && (
        <p className="text-sm text-slate-700">{new Date(state.schedule.start_datetime).toLocaleString()} – {new Date(state.schedule.end_datetime).toLocaleString()}</p>
      )}
    </div>
  );
}