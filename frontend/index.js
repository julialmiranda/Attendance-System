const PROFESSORES = {
  tiago: {
    nome: 'Prof. Tiago',
    email: 'tiago',
    curso: 'Ciência da Computação',
    sigla: 'CC',
    badgeColor: 'background:rgba(96,165,250,.25);color:#93C5FD',
    materia: 'Fundamentos de Redes',
    semestre: '2025/1',
    codigoCurso: 'CC2023'
  },

  fernando: {
    nome: 'Prof. Fernando',
    email: 'fernando',
    curso: 'Agronomia',
    sigla: 'AG',
    badgeColor: 'background:rgba(34,197,94,.2);color:#86EFAC',
    materia: 'Fitossanidade',
    semestre: '2025/1',
    codigoCurso: 'AG2023'
  }
};

const CORES = ['avatar-azul', 'avatar-verde', 'avatar-laranja', 'avatar-roxo'];

let profAtual   = null;
let alunos      = [];
let aulaAtiva   = null;
let rfidInterval= null;
let atestadosTodos = [];
let alunoDetalheId = null;
let editandoId  = null;

async function carregarAlunosBanco() {
    return await api.listarAlunos();
}

async function carregarLogsRFID() {
  try {
    const logs = await api.listarLogs();

    const container = document.getElementById("rfid-log");

    if (!logs || logs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:#64748B;">
          Nenhuma leitura ainda
        </div>
      `;
      return;
    }

    container.innerHTML = logs.slice(0, 8).map(log => {
      const statusCor = log.status === "LIBERADO" || log.status === "REGISTRADO"
        ? "#1A8754"
        : "#C0392B";

      const nome = log.nome || "Tag não cadastrada";
      const matricula = log.matricula || "-";

      return `
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:12px 14px;
          border-bottom:1px solid #E2E8F0;
          font-size:13px;
        ">
          <div>
            <strong>${nome}</strong>
            <div style="color:#64748B;font-size:12px;">
              Matrícula: ${matricula} · TAG: ${log.tag_rfid}
            </div>
          </div>

          <div style="text-align:right;">
            <strong style="color:${statusCor};">${log.tipo}</strong>
            <div style="color:#64748B;font-size:12px;">
              ${log.status} · ${formatarHora(log.timestamp)}
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (erro) {
    console.error("Erro ao carregar logs RFID:", erro);
  }
}

function formatarHora(timestamp) {
  if (!timestamp) return "-";
  const data = new Date(timestamp);
  return data.toLocaleTimeString("pt-BR");
}

async function init() {

  const id = sessionStorage.getItem('atitus_professor');

  if (!id || !PROFESSORES[id]) {
    window.location.href = 'login.html';
    return;
  }

  profAtual = PROFESSORES[id];

  document.getElementById('sidebar-curso').textContent = profAtual.curso;
  document.getElementById('prof-nome').textContent  = profAtual.nome;
  document.getElementById('prof-email').textContent = profAtual.email;

  const badge = document.getElementById('prof-badge');
  badge.textContent = profAtual.curso;
  badge.setAttribute(
    'style',
    profAtual.badgeColor +
    ';font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;display:inline-block;margin-top:6px'
  );

  try {
    await carregarDadosAlunos();

    console.log('ALUNOS:', alunos);

    atualizarStats();
    popularSelectAtestado();
    navigateTo('dashboard');
    carregarLogsRFID();
    setInterval(carregarLogsRFID, 1000);

  } catch (erro) {
    console.error('Erro ao carregar alunos:', erro);
    alert('Não foi possível carregar os alunos do backend Flask.');
  }
};

function logout() {
  sessionStorage.removeItem('atitus_professor');
  window.location.href = 'login.html';
}

const PAGES = {
  dashboard:  { title:'Dashboard',     sub:() => `Visão geral · ${profAtual.materia} · ${profAtual.semestre}` },
  alunos:     { title:'Alunos',        sub:() => `${alunos.length} alunos · ${profAtual.curso}` },
  rfid:       { title:'Chamada RFID',  sub:() => 'Registro de presença por aproximação de cartão' },
  atestados:  { title:'Atestados',     sub:() => 'Gerenciamento de justificativas médicas' },
  relatorios: { title:'Relatórios',    sub:() => `Exportação e análise · ${profAtual.curso}` },
};

function navigateTo(page) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(`view-${page}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{
    if(n.getAttribute('onclick')?.includes(page)) n.classList.add('active');
  });
  document.getElementById('page-title').textContent = PAGES[page].title;
  document.getElementById('page-sub').textContent   = PAGES[page].sub();
  if(page==='alunos')     renderTabela();
  if(page==='atestados')  renderAtestados();
  if(page==='relatorios') renderResumo();
}

function atualizarStats() {
  document.getElementById('stat-total').textContent     = alunos.length;
  document.getElementById('stat-regulares').textContent = alunos.filter(a=>a.status==='regular').length;
  document.getElementById('stat-estaveis').textContent  = alunos.filter(a=>a.status==='estavel').length;
  document.getElementById('stat-criticos').textContent  = alunos.filter(a=>a.status==='critico').length;
}

function renderTabela(lista=alunos) {
  const tbody = document.getElementById('tabela-alunos');
  tbody.innerHTML = lista.map(a => {
    const cor = CORES[a.id % CORES.length];
    const ini = a.nome.split(' ').slice(0,2).map(p=>p[0]).join('');
    const lbl = {regular:'Regular',estavel:'Estável',critico:'Crítico'}[a.status];
    const fill= a.status==='regular'?'var(--verde)':a.status==='estavel'?'var(--amarelo)':'var(--vermelho)';
    return `<tr>
      <td><div class="aluno-info">
        <div class="avatar ${cor}">${ini}</div>
        <div><div class="aluno-nome">${a.nome}</div><div class="aluno-mat">${a.matricula}</div></div>
      </div></td>
      <td style="font-family:monospace;font-size:12px;color:var(--sub)">${a.rfid}</td>
      <td style="font-weight:700;color:var(--verde)">${a.presencas}</td>
      <td class="progress-cell">
        <div class="progress-text"><span>${a.pct}%</span><span>${a.presencas}/${a.totalAulas}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${a.pct}%;background:${fill}"></div></div>
      </td>
      <td style="font-weight:700;color:var(--vermelho)">${a.faltas}</td>
      <td style="color:var(--azul);font-weight:600">${a.atestados}</td>
      <td><span class="badge ${a.status}"><span class="badge-dot"></span>${lbl}</span></td>
      <td><div class="actions">
        <button class="icon-btn" title="Detalhes" onclick="verDetalhe(${a.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button class="icon-btn" title="Editar" onclick="editarAluno(${a.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger" title="Remover" onclick="removerAluno(${a.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
  document.getElementById('count-alunos').textContent = `${lista.length} alunos encontrados`;
  atualizarStats();
}

function filtrarAlunos() {
  const q = document.getElementById('search-aluno').value.toLowerCase();
  const s = document.getElementById('filtro-status').value;
  renderTabela(alunos.filter(a=>
    (a.nome.toLowerCase().includes(q)||a.matricula.includes(q)) && (!s||a.status===s)
  ));
}

function abrirModalAluno() {
  editandoId = null;
  document.getElementById('modal-aluno-title').textContent = 'Novo Aluno';
  ['aluno-mat','aluno-nome','aluno-rfid'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('aluno-total').value='40';
  document.getElementById('aluno-presencas').value='0';
  abrirModal('modal-aluno');
}

function editarAluno(id) {
  editandoId=id;
  const a=alunos.find(x=>x.id===id);
  document.getElementById('modal-aluno-title').textContent='Editar Aluno';
  document.getElementById('aluno-mat').value=a.matricula;
  document.getElementById('aluno-nome').value=a.nome;
  document.getElementById('aluno-rfid').value=a.rfid;
  document.getElementById('aluno-total').value=a.totalAulas;
  document.getElementById('aluno-presencas').value=a.presencas;
  abrirModal('modal-aluno');
}

async function salvarAluno() {
  const nome = document.getElementById('aluno-nome').value.trim();
  const mat = document.getElementById('aluno-mat').value.trim();
  const rfid = document.getElementById('aluno-rfid').value.trim();

  if (!nome || !mat || !rfid) {
    toast('Preencha nome, matrícula e RFID.', 'error');
    return;
  }

  try {
    if (editandoId) {
      toast('Edição completa ainda não existe no backend.', 'info');
      return;
    }

    await api.criarAluno({
      nome,
      matricula: mat,
      curso: profAtual.curso,
      tag_rfid: rfid
    });

    toast('Aluno cadastrado!', 'success');

    fecharModal('modal-aluno');

    const dados = await carregarAlunosBanco();
    alunos = dados.map(mapearAlunoBackend);

    renderTabela();
    popularSelectAtestado();

  } catch (erro) {
    toast(erro.message, 'error');
  }
}

function mapearAlunoBackend(c) {
  return {
    id: c.id,
    nome: c.nome,
    matricula: c.matricula,
    rfid: c.tag_rfid,

    totalAulas: 4,
    presencas: c.status_matricula === "ATIVA" ? 4 : 0,
    faltas: c.status_matricula === "ATIVA" ? 0 : 4,

    atestados: 0,
    faltasEfetivas: 0,
    pct: c.status_matricula === "ATIVA" ? 100 : 0,

    status: c.status_matricula === "ATIVA" ? "regular" : "critico",
    atestadosList: []
  };
}

async function carregarDadosAlunos() {
  const alunosBanco = await api.listarAlunos();
  const presencasBanco = await api.listarPresencas();

  alunos = alunosBanco.map(aluno => {
    const presencasDoAluno = presencasBanco.filter(
      p => p.matricula === aluno.matricula
    );

    const totalAulas = 4;

  const presencas =
    aluno.status_matricula === "ATIVA" ? 4 : 0;

  const faltas =
    aluno.status_matricula === "ATIVA" ? 0 : 4;

  const pct =
    aluno.status_matricula === "ATIVA" ? 100 : 0;

  const status =
    pct >= 75
      ? "regular"
      : pct >= 60
        ? "estavel"
        : "critico";

  return {
    id: aluno.id,
    nome: aluno.nome,
    matricula: aluno.matricula,
    rfid: aluno.tag_rfid,

    totalAulas,
    presencas,
    faltas,

    atestados: 0,
    faltasEfetivas: faltas,

    pct,
    status,

    atestadosList: []
  };
});
};


    /*const totalAulas = 4;
    const presencas = presencasDoAluno.reduce(
      (soma, p) => soma + (p.total_presencas || 0),
      0
    );

    const faltas = Math.max(0, totalAulas - presencas);
    const pct = totalAulas > 0
      ? Math.round((presencas / totalAulas) * 100)
      : 0;

    const status =
      pct >= 75 ? 'regular' :
      pct >= 60 ? 'estavel' :
      'critico';

    return {
      id: aluno.id,
      nome: aluno.nome,
      matricula: aluno.matricula,
      rfid: aluno.tag_rfid,
      totalAulas,
      presencas,
      faltas,
      atestados: 0,
      faltasEfetivas: faltas,
      pct,
      status,
      atestadosList: []
    };
  });
}*/

async function removerAluno(id) {
  if (!confirm('Remover este aluno?')) return;

  try {
    await api.deletarAluno(id);

    alunos = alunos.filter(a => a.id !== id);

    renderTabela();
    popularSelectAtestado();

    toast('Aluno removido.', 'info');

  } catch (erro) {
    toast(erro.message, 'error');
  }
}

function verDetalhe(id) {
  alunoDetalheId=id;
  const a=alunos.find(x=>x.id===id);
  const ini=a.nome.split(' ').slice(0,2).map(p=>p[0]).join('');
  const lbl={regular:'Regular',estavel:'Estável',critico:'Crítico'}[a.status];
  const ats=atestadosTodos.filter(t=>t.alunoId===id);
  document.getElementById('modal-detalhe-body').innerHTML=`
    <div class="detail-header">
      <div class="detail-avatar">${ini}</div>
      <div class="detail-info">
        <h2>${a.nome}</h2>
        <p>${a.matricula} · RFID: ${a.rfid} · ${profAtual.curso}</p>
        <span class="badge ${a.status}" style="margin-top:8px;display:inline-flex">${lbl}</span>
      </div>
    </div>
    <div class="detail-stats">
      <div class="detail-stat verde-border"><div class="detail-stat-val" style="color:var(--verde)">${a.presencas}</div><div class="detail-stat-lbl">Presenças</div></div>
      <div class="detail-stat amarelo-border"><div class="detail-stat-val" style="color:var(--amarelo)">${a.faltas}</div><div class="detail-stat-lbl">Faltas Brutas</div></div>
      <div class="detail-stat vermelho-border"><div class="detail-stat-val" style="color:var(--vermelho)">${a.faltasEfetivas}</div><div class="detail-stat-lbl">Faltas Efetivas</div></div>
    </div>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600">Frequência</span>
        <span style="font-weight:700;color:${a.pct>=75?'var(--verde)':a.pct>=60?'var(--amarelo)':'var(--vermelho)'}">${a.pct}%</span>
      </div>
      <div class="progress-bar" style="height:10px">
        <div class="progress-fill" style="width:${a.pct}%;background:${a.pct>=75?'var(--verde)':a.pct>=60?'var(--amarelo)':'var(--vermelho)'}"></div>
      </div>
      <div style="font-size:11px;color:var(--sub);margin-top:4px">Mínimo para aprovação: 75% (${Math.ceil(a.totalAulas*.75)} aulas)</div>
    </div>
    <div style="font-size:14px;font-weight:700;margin-bottom:10px">Atestados (${ats.length})</div>
    <ul class="atestado-list">${ats.length?ats.map(t=>`
      <li class="atestado-item">
        <div class="atestado-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>
        <div><div class="atestado-desc">${t.descricao||'Atestado médico'}</div><div class="atestado-dates">${t.inicio} → ${t.fim} · ${t.faltas} falta(s)</div></div>
      </li>`).join(''):`<div class="empty-state" style="padding:20px"><p>Nenhum atestado registrado.</p></div>`}
    </ul>`;
  abrirModal('modal-detalhe');
}

function abrirAtestadoParaAluno() {
  fecharModal('modal-detalhe');
  popularSelectAtestado();
  document.getElementById('atestado-aluno').value=alunoDetalheId;
  abrirModal('modal-atestado');
}

function popularSelectAtestado() {
  const sel=document.getElementById('atestado-aluno');
  sel.innerHTML='<option value="">Selecione o aluno...</option>'+
    alunos.map(a=>`<option value="${a.id}">${a.nome} (${a.matricula})</option>`).join('');
}

function abrirModalAtestado() {
  popularSelectAtestado();
  const hoje=new Date().toISOString().split('T')[0];
  document.getElementById('atestado-inicio').value=hoje;
  document.getElementById('atestado-fim').value=hoje;
  document.getElementById('atestado-desc').value='';
  document.getElementById('atestado-faltas').value='1';
  abrirModal('modal-atestado');
}

function salvarAtestado() {
  const alunoId=parseInt(document.getElementById('atestado-aluno').value);
  const inicio=document.getElementById('atestado-inicio').value;
  const fim=document.getElementById('atestado-fim').value;
  const desc=document.getElementById('atestado-desc').value.trim();
  const faltas=parseInt(document.getElementById('atestado-faltas').value)||1;
  if(!alunoId||!inicio||!fim){toast('Preencha todos os campos.','error');return;}
  const at={id:Date.now(),alunoId,inicio,fim,descricao:desc,faltas};
  atestadosTodos.push(at);
  const a=alunos.find(x=>x.id===alunoId);
  a.atestados+=faltas;
  a.faltasEfetivas=Math.max(0,a.faltas-a.atestados);
  a.atestadosList.push(at);
  fecharModal('modal-atestado');
  toast(`Atestado de ${a.nome} registrado!`,'success');
  renderAtestados();
  renderTabela();
}

function renderAtestados() {
  const filtro=document.getElementById('search-atestado')?.value.toLowerCase()||'';
  const lista=atestadosTodos.filter(t=>{
    const a=alunos.find(x=>x.id===t.alunoId);
    return !filtro||a?.nome.toLowerCase().includes(filtro);
  });
  const tbody=document.getElementById('tabela-atestados');
  tbody.innerHTML=lista.length?lista.map(t=>{
    const a=alunos.find(x=>x.id===t.alunoId);
    const dias=Math.round((new Date(t.fim)-new Date(t.inicio))/(864e5))+1;
    return `<tr>
      <td><div class="aluno-info">
        <div class="avatar ${CORES[a.id%CORES.length]}">${a.nome.split(' ').slice(0,2).map(p=>p[0]).join('')}</div>
        <div><div class="aluno-nome">${a.nome}</div><div class="aluno-mat">${a.matricula}</div></div>
      </div></td>
      <td style="font-size:12px">${t.inicio} → ${t.fim}</td>
      <td><span class="badge estavel">${dias} dia(s)</span></td>
      <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${t.descricao||'—'}</td>
      <td style="font-weight:700;color:var(--azul)">${t.faltas}</td>
      <td><button class="icon-btn danger" onclick="removerAtestado(${t.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button></td>
    </tr>`;
  }).join(''):`<tr><td colspan="6"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>Nenhum atestado</h3><p>Registre o primeiro atestado.</p></div></td></tr>`;
}

function filtrarAtestados() { renderAtestados(); }

function removerAtestado(id) {
  const t=atestadosTodos.find(x=>x.id===id);
  if(!t) return;
  const a=alunos.find(x=>x.id===t.alunoId);
  a.atestados=Math.max(0,a.atestados-t.faltas);
  a.faltasEfetivas=Math.max(0,a.faltas-a.atestados);
  atestadosTodos=atestadosTodos.filter(x=>x.id!==id);
  renderAtestados();
  toast('Atestado removido.','info');
}

function abrirModalNovaAula() {
  const hoje=new Date().toISOString().split('T')[0];
  const agora=new Date().toTimeString().slice(0,5);
  document.getElementById('nova-aula-data').value=hoje;
  document.getElementById('nova-aula-hora').value=agora;
  document.getElementById('nova-aula-desc').value='';
  abrirModal('modal-nova-aula');
}

function confirmarNovaAula() {
  const data=document.getElementById('nova-aula-data').value;
  const hora=document.getElementById('nova-aula-hora').value;
  const desc=document.getElementById('nova-aula-desc').value.trim()||'Aula sem título';
  if(!data||!hora){toast('Informe data e horário.','error');return;}
  aulaAtiva={id:Date.now(),data,hora,desc,presentes:[]};
  fecharModal('modal-nova-aula');
  navigateTo('rfid');
  startRFIDScan();
  document.getElementById('aula-atual-badge').textContent=`Aula: ${desc}`;
  toast(`Aula "${desc}" iniciada!`,'success');
}

function startRFIDScan() {
  document.getElementById('rfid-box').classList.add('scanning');
  document.getElementById('rfid-title').textContent='Leitor ativo — aguardando cartões';
  document.getElementById('rfid-desc').textContent='Aproxime o cartão ao leitor';
  document.getElementById('rfid-aula-info').textContent=`${aulaAtiva.desc} · ${aulaAtiva.data} ${aulaAtiva.hora}`;
  document.getElementById('btn-iniciar-aula').style.display='none';
  document.getElementById('btn-encerrar-aula').style.display='flex';
  document.getElementById('rfid-empty').style.display='none';
  rfidInterval=setInterval(simularRFID,4000);
}

function simularRFID() {
  const restantes=alunos.filter(a=>!aulaAtiva.presentes.includes(a.id));
  if(!restantes.length){encerrarAula();return;}
  const aluno=restantes[Math.floor(Math.random()*restantes.length)];
  aulaAtiva.presentes.push(aluno.id);
  aluno.presencas++;
  aluno.faltas=aluno.totalAulas-aluno.presencas;
  aluno.pct=Math.round((aluno.presencas/aluno.totalAulas)*100);
  aluno.status=aluno.pct>=75?'regular':aluno.pct>=60?'estavel':'critico';
  adicionarLog(aluno,'presenca');
}

function adicionarLog(aluno,tipo) {
  const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const li=document.createElement('li');
  li.className='log-item';
  li.innerHTML=`<span class="log-time">${hora}</span><span class="log-name">${aluno.nome}</span><span class="log-badge ${tipo==='presenca'?'p':'f'}">${tipo==='presenca'?'Presente':'Falta'}</span>`;
  document.getElementById('rfid-log').prepend(li);
  document.getElementById('rfid-count').textContent=`${aulaAtiva.presentes.length} presentes`;
  const dashLog=document.getElementById('log-list');
  dashLog.querySelector('.empty-state')?.remove();
  dashLog.prepend(li.cloneNode(true));
  atualizarStats();
}

function encerrarAula() {
  clearInterval(rfidInterval); rfidInterval=null;
  document.getElementById('rfid-box').classList.remove('scanning');
  document.getElementById('rfid-title').textContent='Aula encerrada';
  document.getElementById('rfid-desc').textContent=`${aulaAtiva?.presentes?.length||0} presenças registradas.`;
  document.getElementById('btn-iniciar-aula').style.display='flex';
  document.getElementById('btn-encerrar-aula').style.display='none';
  toast(`Aula encerrada. ${aulaAtiva?.presentes?.length||0} presenças registradas.`,'info');
  aulaAtiva=null;
}

function renderResumo() {
  const media=Math.round(alunos.reduce((s,a)=>s+a.pct,0)/alunos.length);
  const items=[
    {val:alunos.length,lbl:'Total de alunos',cor:'var(--azul)'},
    {val:`${media}%`,lbl:'Média de frequência',cor:media>=75?'var(--verde)':'var(--vermelho)'},
    {val:alunos.filter(a=>a.status==='critico').length,lbl:'Alunos em situação crítica',cor:'var(--vermelho)'},
    {val:alunos[0]?.totalAulas||40,lbl:'Aulas realizadas',cor:'var(--sub)'},
    {val:atestadosTodos.length,lbl:'Atestados registrados',cor:'var(--azul)'},
    {val:alunos.filter(a=>a.status==='regular').length,lbl:'Alunos regulares',cor:'var(--verde)'},
  ];
  document.getElementById('resumo-turma').innerHTML=items.map(i=>`
    <div class="detail-stat"><div class="detail-stat-val" style="color:${i.cor}">${i.val}</div><div class="detail-stat-lbl">${i.lbl}</div></div>`).join('');
}

function gerarPDF(apenasCriticos=false) {
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const lista=apenasCriticos?alunos.filter(a=>a.status==='critico'):alunos;
  doc.setFillColor(0,63,140);
  doc.rect(0,0,297,22,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('ATITUS EDUCAÇÃO',14,9);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(`${profAtual.curso} · ${profAtual.materia} · ${profAtual.semestre}`,14,16);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,220,16);
  doc.setTextColor(30,30,30);
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(apenasCriticos?'Alunos em Situação Crítica':'Lista de Presenças — Turma Completa',14,30);
  const reg=alunos.filter(a=>a.status==='regular').length;
  const est=alunos.filter(a=>a.status==='estavel').length;
  const crit=alunos.filter(a=>a.status==='critico').length;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
  doc.text(`Professor(a): ${profAtual.nome}  |  Total: ${alunos.length}  |  Regular: ${reg}  |  Estável: ${est}  |  Crítico: ${crit}  |  Mín.: 75%`,14,37);
  doc.autoTable({
    startY:42,
    head:[['#','Matrícula','Nome','RFID','Presenças','Faltas','Atestados','F. Efetivas','Frequência','Situação']],
    body:lista.map((a,i)=>[i+1,a.matricula,a.nome,a.rfid,a.presencas,a.faltas,a.atestados,a.faltasEfetivas,`${a.pct}%`,{regular:'Regular',estavel:'Estável',critico:'Crítico'}[a.status]]),
    styles:{fontSize:7.5,cellPadding:3,valign:'middle'},
    headStyles:{fillColor:[0,63,140],textColor:255,fontStyle:'bold',fontSize:8},
    alternateRowStyles:{fillColor:[248,250,255]},
    columnStyles:{0:{halign:'center',cellWidth:8},1:{cellWidth:24},2:{cellWidth:52},3:{cellWidth:22,font:'courier',fontSize:7},4:{halign:'center',cellWidth:18},5:{halign:'center',cellWidth:14},6:{halign:'center',cellWidth:18},7:{halign:'center',cellWidth:22},8:{halign:'center',cellWidth:20,fontStyle:'bold'},9:{halign:'center',cellWidth:20}},
    didParseCell:(d)=>{
      if(d.section==='body'&&d.column.index===9){
        const v=d.cell.raw;
        if(v==='Regular') d.cell.styles.textColor=[26,135,84];
        else if(v==='Estável') d.cell.styles.textColor=[180,83,9];
        else if(v==='Crítico') d.cell.styles.textColor=[192,57,43];
        d.cell.styles.fontStyle='bold';
      }
      if(d.section==='body'&&d.column.index===8){
        const v=parseInt(d.cell.raw);
        if(v>=75) d.cell.styles.textColor=[26,135,84];
        else if(v>=60) d.cell.styles.textColor=[180,83,9];
        else d.cell.styles.textColor=[192,57,43];
        d.cell.styles.fontStyle='bold';
      }
    }
  });
  const ph=doc.internal.pageSize.height;
  doc.setFontSize(7); doc.setTextColor(150,150,150);
  doc.text(`Atitus Educação · ${profAtual.curso} · Documento gerado automaticamente`,14,ph-8);
  doc.save(`presencas_${profAtual.sigla.toLowerCase()}_${apenasCriticos?'criticos_':''}${new Date().toISOString().slice(0,10)}.pdf`);
  toast('PDF gerado com sucesso!','success');
}


function abrirModal(id){ document.getElementById(id).classList.add('open'); }
function fecharModal(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click',e=>{ if(e.target===ov) fecharModal(ov.id); });
});

function toast(msg,type='info'){
  const icons={success:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,error:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`,info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`${icons[type]}<span>${msg}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(()=>el.remove(),3500);
}

init();