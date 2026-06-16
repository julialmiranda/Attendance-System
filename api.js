/**
 * ATITUS EDUCAÇÃO — Sistema de Presenças RFID
 * Módulo de conexão com a API do backend
 * ============================================
 * Configure BASE_URL com o endereço do seu servidor.
 * Todos os métodos retornam Promises e lançam erros com mensagens descritivas.
 */

const API_CONFIG = {
  BASE_URL: "http://localhost:8080/api", // ← altere para o endereço do seu backend
  TIMEOUT_MS: 10000,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// ─── Utilitários internos ────────────────────────────────────────────────────

async function request(method, path, body = null, customHeaders = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const options = {
      method,
      headers: { ...API_CONFIG.HEADERS, ...customHeaders },
      signal: controller.signal,
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, options);
    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Erro ${response.status}: ${response.statusText}`
      );
    }

    // Retorna null para respostas 204 No Content
    if (response.status === 204) return null;
    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError")
      throw new Error("Tempo limite da requisição esgotado.");
    throw err;
  }
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);
const put = (path, body) => request("PUT", path, body);
const del = (path) => request("DELETE", path);

// ─── Alunos ─────────────────────────────────────────────────────────────────

/**
 * Retorna todos os alunos com seus totais de presença/falta.
 * GET /alunos
 * Response: [{ id, matricula, nome, rfid_tag, total_aulas, presencas, faltas, atestados, status }]
 */
export async function getAlunos() {
  return get("/alunos");
}

/**
 * Retorna um aluno específico pelo ID.
 * GET /alunos/:id
 */
export async function getAluno(id) {
  return get(`/alunos/${id}`);
}

/**
 * Cria um novo aluno.
 * POST /alunos
 * Body: { matricula, nome, rfid_tag }
 */
export async function criarAluno(dados) {
  return post("/alunos", dados);
}

/**
 * Atualiza dados de um aluno.
 * PUT /alunos/:id
 */
export async function atualizarAluno(id, dados) {
  return put(`/alunos/${id}`, dados);
}

/**
 * Remove um aluno.
 * DELETE /alunos/:id
 */
export async function deletarAluno(id) {
  return del(`/alunos/${id}`);
}

// ─── Presenças ───────────────────────────────────────────────────────────────

/**
 * Retorna o histórico de presenças, opcionalmente filtrado.
 * GET /presencas?turma_id=&data_inicio=&data_fim=&aluno_id=
 * Response: [{ id, aluno_id, aluno_nome, data, horario, tipo, aula_descricao }]
 */
export async function getPresencas(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "")
  );
  const query = params.toString() ? `?${params}` : "";
  return get(`/presencas${query}`);
}

/**
 * Registra presença via leitura RFID (chamado pelo leitor físico ou manualmente).
 * POST /presencas/rfid
 * Body: { rfid_tag, aula_id }
 * Response: { aluno, presenca, status }
 */
export async function registrarPresencaRFID(rfid_tag, aula_id) {
  return post("/presencas/rfid", { rfid_tag, aula_id });
}

/**
 * Registra presença manualmente pelo professor.
 * POST /presencas
 * Body: { aluno_id, aula_id, tipo } — tipo: "presenca" | "falta"
 */
export async function registrarPresencaManual(aluno_id, aula_id, tipo = "presenca") {
  return post("/presencas", { aluno_id, aula_id, tipo });
}

/**
 * Retorna a lista de presenças de uma aula específica.
 * GET /presencas/aula/:aula_id
 */
export async function getPresencasPorAula(aula_id) {
  return get(`/presencas/aula/${aula_id}`);
}

// ─── Aulas ───────────────────────────────────────────────────────────────────

/**
 * Retorna todas as aulas da turma (com data, horário e total de presentes).
 * GET /aulas
 */
export async function getAulas() {
  return get("/aulas");
}

/**
 * Cria uma nova aula/chamada.
 * POST /aulas
 * Body: { data, horario, descricao, turma_id }
 */
export async function criarAula(dados) {
  return post("/aulas", dados);
}

/**
 * Encerra uma aula (fecha a janela de leitura RFID).
 * PUT /aulas/:id/encerrar
 */
export async function encerrarAula(id) {
  return put(`/aulas/${id}/encerrar`, {});
}

// ─── Atestados ───────────────────────────────────────────────────────────────

/**
 * Retorna todos os atestados de um aluno.
 * GET /atestados?aluno_id=
 */
export async function getAtestados(aluno_id) {
  return get(`/atestados?aluno_id=${aluno_id}`);
}

/**
 * Adiciona um atestado médico para um aluno.
 * POST /atestados
 * Body: { aluno_id, data_inicio, data_fim, descricao, arquivo_base64? }
 * Response: { id, aluno_id, faltas_justificadas, status_atualizado }
 */
export async function adicionarAtestado(dados) {
  return post("/atestados", dados);
}

/**
 * Remove um atestado.
 * DELETE /atestados/:id
 */
export async function removerAtestado(id) {
  return del(`/atestados/${id}`);
}

// ─── Relatórios / PDF ────────────────────────────────────────────────────────

/**
 * Solicita o PDF de lista de presença ao backend.
 * GET /relatorios/presencas/pdf?turma_id=&data_inicio=&data_fim=
 * Response: Blob (application/pdf)
 */
export async function gerarRelatorioPDF(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "")
  );
  const query = params.toString() ? `?${params}` : "";
  const url = `${API_CONFIG.BASE_URL}/relatorios/presencas/pdf${query}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) throw new Error(`Erro ao gerar PDF: ${response.statusText}`);
  return response.blob(); // Use com URL.createObjectURL() para download
}

/**
 * Solicita resumo estatístico da turma.
 * GET /relatorios/turma/resumo
 * Response: { total_alunos, media_presencas, alunos_criticos, alunos_estaveis, alunos_regulares, aulas_realizadas }
 */
export async function getResumoDaTurma() {
  return get("/relatorios/turma/resumo");
}

// ─── Status / Saúde ──────────────────────────────────────────────────────────

/**
 * Verifica se o backend e o leitor RFID estão online.
 * GET /status
 * Response: { backend: "ok", rfid_reader: "ok"|"offline", versao: "1.0.0" }
 */
export async function verificarStatus() {
  return get("/status");
}

// ─── Exportações nomeadas já declaradas acima ────────────────────────────────
// Também exportamos a configuração para que o index.html possa ajustá-la
export { API_CONFIG };