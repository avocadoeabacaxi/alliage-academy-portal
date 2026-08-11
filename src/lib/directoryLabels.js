const common = {
  pt: { add: 'Novo cadastro', edit: 'Editar cadastro', save: 'Salvar', saving: 'Salvando...', delete: 'Excluir', loading: 'Carregando...', empty: 'Nenhum cadastro encontrado', owner: 'Responsável' },
  en: { add: 'New record', edit: 'Edit record', save: 'Save', saving: 'Saving...', delete: 'Delete', loading: 'Loading...', empty: 'No records found', owner: 'Owner' },
  es: { add: 'Nuevo registro', edit: 'Editar registro', save: 'Guardar', saving: 'Guardando...', delete: 'Eliminar', loading: 'Cargando...', empty: 'No se encontraron registros', owner: 'Responsable' }
};
export const directoryLabels = (lang) => common[lang] || common.pt;
export const teamCopy = {
  pt: { title: 'Minha equipe', subtitle: 'Cadastre as pessoas vinculadas à sua conta.', name: 'Nome', email: 'Email', phone: 'Telefone', position: 'Cargo', region: 'Região' },
  en: { title: 'My team', subtitle: 'Register the people linked to your account.', name: 'Name', email: 'Email', phone: 'Phone', position: 'Position', region: 'Region' },
  es: { title: 'Mi equipo', subtitle: 'Registre las personas vinculadas a su cuenta.', name: 'Nombre', email: 'Email', phone: 'Teléfono', position: 'Cargo', region: 'Región' }
};
export const clientCopy = {
  pt: { title: 'Base de clientes', subtitle: 'Cadastre e gerencie seus clientes.', name: 'Cliente / Empresa', contact: 'Contato', email: 'Email', phone: 'Telefone', country: 'País', city: 'Cidade', region: 'Região', notes: 'Observações' },
  en: { title: 'Client base', subtitle: 'Register and manage your clients.', name: 'Client / Company', contact: 'Contact', email: 'Email', phone: 'Phone', country: 'Country', city: 'City', region: 'Region', notes: 'Notes' },
  es: { title: 'Base de clientes', subtitle: 'Registre y gestione sus clientes.', name: 'Cliente / Empresa', contact: 'Contacto', email: 'Email', phone: 'Teléfono', country: 'País', city: 'Ciudad', region: 'Región', notes: 'Observaciones' }
};