const USUARIOS = {
  tiago: {
    senha: '123456',
    professorId: 'tiago',
    nome: 'Tiago',
    curso: 'Ciência da Computação'
  },
  fernando: {
    senha: '123456',
    professorId: 'fernando',
    nome: 'Fernando',
    curso: 'Agronomia'
  }
};

function toggleSenha() {
  const input = document.getElementById('input-senha');
  const icon = document.getElementById('eye-icon');

  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `;
  } else {
    input.type = 'password';
    icon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }
}

function fazerLogin() {
  const inputEmail = document.getElementById('input-email');
  const inputSenha = document.getElementById('input-senha');

  const usuario = inputEmail.value.trim();
  const senha = inputSenha.value;

  const errEl = document.getElementById('error-msg');
  const btn = document.getElementById('btn-login');
  const spinner = document.getElementById('spinner');
  const btnIcon = document.getElementById('btn-icon');
  const btnText = document.getElementById('btn-text');

  errEl.classList.remove('show');
  inputEmail.classList.remove('error');
  inputSenha.classList.remove('error');

  btn.disabled = true;
  spinner.style.display = 'block';
  btnIcon.style.display = 'none';
  btnText.textContent = 'Entrando...';

  setTimeout(() => {
    const user = USUARIOS[usuario];

    if (user && user.senha === senha) {
      sessionStorage.setItem('atitus_professor', user.professorId);
      window.location.href = 'index.html';
      return;
    }

    errEl.classList.add('show');
    inputEmail.classList.add('error');
    inputSenha.classList.add('error');

    btn.disabled = false;
    spinner.style.display = 'none';
    btnIcon.style.display = '';
    btnText.textContent = 'Entrar na plataforma';
  }, 900);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    fazerLogin();
  }
});