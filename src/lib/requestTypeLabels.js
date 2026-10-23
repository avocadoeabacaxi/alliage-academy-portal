const copy = {
  pt: { training: 'Treinamento', trainingDesc: 'Solicite treinamentos, reciclagens e atualizações de produto.', support: 'Apoio Técnico', supportDesc: 'Solicite apoio técnico, consultas, licitações ou modificações de produto.', trainingForm: 'Solicitação de Treinamento', supportForm: 'Solicitação de Apoio Técnico', all: 'Todos os tipos', event: 'Evento' },
  en: { training: 'Training', trainingDesc: 'Request training, refreshers and product updates.', support: 'Technical Support', supportDesc: 'Request technical support, consultations, bids or product modifications.', trainingForm: 'Training Request', supportForm: 'Technical Support Request', all: 'All types', event: 'Event' },
  es: { training: 'Entrenamiento', trainingDesc: 'Solicite entrenamientos, reciclajes y actualizaciones de producto.', support: 'Soporte Técnico', supportDesc: 'Solicite soporte técnico, consultas, licitaciones o modificaciones de producto.', trainingForm: 'Solicitud de Entrenamiento', supportForm: 'Solicitud de Soporte Técnico', all: 'Todos los tipos', event: 'Evento' }
};
export const requestTypeLabels = (lang) => copy[lang] || copy.pt;
export { supportTypes, trainingTypes, requestKind } from '../../server/request-kinds.mjs';
