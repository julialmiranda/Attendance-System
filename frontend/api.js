const API_BASE_URL = 'http://10.1.25.114:5000'; 

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensagem || `Erro ${response.status}`);
  }

  return data;
}

const api = {
  listarAlunos: (professorId) => request(`/alunos?professor_id=${professorId}`),
  criarAluno: (aluno) => request('/alunos', {
    method: 'POST',
    body: JSON.stringify(aluno)
  }),

  editarAluno: (id, aluno) => request(`/alunos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(aluno)
  }),

  deletarAluno: (id) => request(`/alunos/${id}`, {
    method: 'DELETE'
  }),

  alterarStatusMatricula: (id, status_matricula) => request(`/alunos/${id}/status-matricula`, {
    method: 'PUT',
    body: JSON.stringify({ status_matricula })
  }),

  alterarAcesso: (id, acesso) => request(`/alunos/${id}/acesso`, {
    method: 'PUT',
    body: JSON.stringify({ acesso })
  }),

  alterarAtivo: (id, ativo) => request(`/alunos/${id}/ativo`, {
    method: 'PUT',
    body: JSON.stringify({ ativo })
  }),

  registrarRFID: (tag_rfid) => request('/rfid', {
    method: 'POST',
    body: JSON.stringify({ tag_rfid })
  }),

  listarLogs: (professorId) => request(`/logs?professor_id=${professorId}`),
  listarPresencas: () => request('/presencas'),
  buscarDashboard: () => request('/dashboard'),
  listarFaltosos: () => request('/faltosos'),
  historicoAluno: (id) => request(`/alunos/${id}/historico`)
};