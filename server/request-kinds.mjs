export const supportTypes = ['Apoio técnico', 'Consulta de mercado', 'Licitação', 'Modificação de produto', 'Treinamento de integração'];
export const trainingTypes = ['Novo treinamento', 'Reciclagem', 'Atualização de produto', 'Treinamento de lançamento', 'Técnico avançado', 'Treinamento clínico'];
export const requestKind = (request) => request.request_category === 'Evento' ? 'event'
  : request.request_kind === 'support' || supportTypes.includes(request.request_type) ? 'support' : 'training';
