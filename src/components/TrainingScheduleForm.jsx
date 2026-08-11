import React from 'react';
import { Loader2 } from 'lucide-react';

export default function TrainingScheduleForm({ state, labels }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {labels.start}
          <input type="datetime-local" value={state.start} onChange={(e) => state.setStart(e.target.value)} className="input-base mt-1" />
        </label>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {labels.end}
          <input type="datetime-local" value={state.end} onChange={(e) => state.setEnd(e.target.value)} className="input-base mt-1" />
        </label>
      </div>
      {state.message && <p className={`text-sm ${state.suggestions.length ? 'text-amber-700' : 'text-slate-600'}`}>{state.message}</p>}
      {state.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{labels.suggestions}</p>
          <div className="flex flex-wrap gap-2">
            {state.suggestions.map((slot) => (
              <button key={slot.start.toISOString()} type="button" onClick={() => state.chooseSuggestion(slot)} className="px-3 py-2 text-xs font-semibold text-[#003B5C] bg-cyan-50 border border-cyan-200 rounded-full hover:bg-cyan-100">
                {slot.start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} – {slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={state.save} disabled={state.saving || !state.start || !state.end} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] disabled:opacity-40">
        {state.saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {state.schedule ? labels.update : labels.save}
      </button>
    </div>
  );
}