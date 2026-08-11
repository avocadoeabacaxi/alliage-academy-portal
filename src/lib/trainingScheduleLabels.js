const labels = {
  pt: { title: 'Agenda do educador', start: 'Início', end: 'Término', save: 'Agendar treinamento', update: 'Atualizar agendamento', conflict: 'Este educador já possui um compromisso nesse período, considerando 40 minutos antes e depois.', suggestions: 'Próximos horários livres', invalid: 'O término deve ser posterior ao início.', saved: 'Agendamento salvo.', educator: 'Educador' },
  en: { title: 'Educator schedule', start: 'Start', end: 'End', save: 'Schedule training', update: 'Update schedule', conflict: 'This educator already has an appointment in this period, including 40 minutes before and after.', suggestions: 'Next available times', invalid: 'The end must be after the start.', saved: 'Schedule saved.', educator: 'Educator' },
  es: { title: 'Agenda del educador', start: 'Inicio', end: 'Fin', save: 'Programar capacitación', update: 'Actualizar programación', conflict: 'Este educador ya tiene un compromiso en este período, considerando 40 minutos antes y después.', suggestions: 'Próximos horarios disponibles', invalid: 'El fin debe ser posterior al inicio.', saved: 'Programación guardada.', educator: 'Educador' }
};

export default function trainingScheduleLabels(lang) {
  return labels[lang] || labels.pt;
}