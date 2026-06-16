DROP TABLE IF EXISTS logs_acesso CASCADE;
DROP TABLE IF EXISTS presencas CASCADE;
DROP TABLE IF EXISTS colaboradores CASCADE;
DROP TABLE IF EXISTS usuarios_sistema CASCADE;

CREATE TABLE colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    curso VARCHAR(100),
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
        'ACESSO_NEGADO',
        'TAG_NAO_CADASTRADA',
        'MATRICULA_INATIVA'
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
    colaborador_id INTEGER REFERENCES colaboradores(id),
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
    perfil VARCHAR(30) DEFAULT 'admin'
);

INSERT INTO usuarios_sistema (usuario, senha, perfil)
VALUES ('admin', '123456', 'admin');

INSERT INTO colaboradores
(nome, matricula, curso, tag_rfid, acesso, ativo, status_matricula)
VALUES
('Julia', '001', 'Sistemas de Informação', '553307625663', TRUE, TRUE, 'ATIVA'),
('Visitante', '002', 'Visitante', '771439528262', FALSE, TRUE, 'ATIVA'),
('Aluno Trancado', '003', 'Sistemas de Informação', '999999999999', TRUE, TRUE, 'TRANCADA'),
('Aluno Formado', '004', 'Sistemas de Informação', '888888888888', TRUE, TRUE, 'FORMADO');

UPDATE colaboradores SET status_matricula = 'TRANCADA' WHERE tag_rfid = '999999999999';

SELECT * FROM colaboradores;

SELECT * FROM logs_acesso ORDER BY id DESC;