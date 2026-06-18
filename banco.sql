DROP TABLE IF EXISTS logs_acesso CASCADE;
DROP TABLE IF EXISTS presencas CASCADE;
DROP TABLE IF EXISTS alunos CASCADE;
DROP TABLE IF EXISTS usuarios_sistema CASCADE;

CREATE TABLE alunos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    curso VARCHAR(100) NOT NULL,
    professor_id VARCHAR(50) NOT NULL,
    tag_rfid VARCHAR(50) UNIQUE NOT NULL,
    acesso BOOLEAN DEFAULT TRUE,
    ativo BOOLEAN DEFAULT TRUE,
    status_matricula VARCHAR(30) DEFAULT 'ATIVA',

    CONSTRAINT chk_status_matricula
    CHECK (status_matricula IN (
        'ATIVA',
        'TRANCADA',
        'FORMADO',
        'CANCELADA',
        'TRANSFERIDO',
        'EVADIDO'
    )),

    CONSTRAINT chk_professor_id
    CHECK (professor_id IN (
        'tiago',
        'fernando'
    ))
);

CREATE TABLE logs_acesso (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    nome VARCHAR(100),
    matricula VARCHAR(20),
    tag_rfid VARCHAR(50),
    status VARCHAR(50),
    mensagem TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tipo_log
    CHECK (tipo IN (
        'ENTRADA',
        'SAIDA',
        'ACESSO NEGADO',
        'TAG NAO CADASTRADA',
        'MATRICULA INATIVA'
    )),

    CONSTRAINT chk_status_log
    CHECK (status IN (
        'LIBERADO',
        'NEGADO',
        'REGISTRADO'
    ))
);

CREATE TABLE presencas (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
    nome VARCHAR(100),
    matricula VARCHAR(20),
    tag_rfid VARCHAR(50),
    data_aula DATE DEFAULT CURRENT_DATE,
    entrada TIMESTAMP,
    saida TIMESTAMP,
    tempo_permanencia_minutos NUMERIC DEFAULT 0,
    presenca_1 BOOLEAN DEFAULT FALSE,
    presenca_2 BOOLEAN DEFAULT FALSE,
    presenca_3 BOOLEAN DEFAULT FALSE,
    presenca_4 BOOLEAN DEFAULT FALSE,
    total_presencas INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ABERTA',

    CONSTRAINT chk_status_presenca
    CHECK (status IN (
        'ABERTA',
        'FECHADA',
        'CANCELADA'
    ))
);

CREATE TABLE usuarios_sistema (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) DEFAULT 'admin',
    professor_id VARCHAR(50),
    curso VARCHAR(100),

    CONSTRAINT chk_usuario_professor_id
    CHECK (
        professor_id IS NULL OR professor_id IN (
            'tiago',
            'fernando'
        )
    )
);

INSERT INTO usuarios_sistema
(usuario, senha, perfil, professor_id, curso)
VALUES
('admin', '123456', 'admin', NULL, NULL),
('tiago', '123456', 'professor', 'tiago', 'Ciência da Computação'),
('fernando', '123456', 'professor', 'fernando', 'Agronomia');

INSERT INTO alunos
(nome, matricula, curso, professor_id, tag_rfid, acesso, ativo, status_matricula)
VALUES
('Julia', '001', 'Ciência da Computação', 'tiago', '553307625663', TRUE, TRUE, 'ATIVA'),
('Maria Souza', '002', 'Ciência da Computação', 'tiago', '999999999999', TRUE, TRUE, 'TRANCADA'),
('Carlos Oliveira', '003', 'Ciência da Computação', 'tiago', '888888888888', TRUE, TRUE, 'FORMADO'),

('Ana Costa', '004', 'Agronomia', 'fernando', '444444444444', TRUE, TRUE, 'ATIVA'),
('Pedro Santos', '005', 'Agronomia', 'fernando', '555555555555', TRUE, TRUE, 'ATIVA'),
('Luiza Martins', '006', 'Agronomia', 'fernando', '666666666666', TRUE, TRUE, 'ATIVA');

SELECT id, nome, matricula, curso, professor_id, tag_rfid, status_matricula
FROM alunos
ORDER BY id;

SELECT * FROM logs_acesso ORDER BY id DESC;