# Attendance System - Smart Campus RFID

Sistema de monitoramento de presença acadêmica utilizando RFID, Raspberry Pi, Arduino e uma aplicação web integrada.

## Sobre o Projeto

O Attendance System foi desenvolvido com o objetivo de automatizar o processo de chamada em ambientes acadêmicos por meio da identificação de alunos utilizando cartões RFID.

A solução permite registrar entradas e saídas automaticamente, calcular frequência acadêmica e disponibilizar as informações em uma interface web para acompanhamento em tempo real.

O projeto foi desenvolvido como aplicação prática dos conhecimentos adquiridos na disciplina de Hardware Architecture.

## Arquitetura da Solução


Cartão RFID
      │
      ▼
Leitor RFID MFRC522
      │
      ▼
Arduino Uno
      │ 
      ▼
Raspberry Pi
      │
      ▼
API Flask (Python)
      │
      ▼
PostgreSQL
      │
      ▼
Dashboard Web

## Tecnologias Utilizadas

### Hardware

* Arduino Uno
* Raspberry Pi
* Leitor RFID MFRC522
* LEDs de sinalização
* Buzzer

### Backend

* Python
* Flask
* PostgreSQL
* Psycopg2

### Frontend

* HTML
* CSS
* JavaScript

### Ferramentas

* GitHub
* Postman
* VS Code

## Funcionalidades

* Cadastro de alunos
* Leitura de cartões RFID
* Registro de entrada e saída
* Controle de acesso
* Cálculo automático de frequência
* Dashboard para acompanhamento em tempo real
* Histórico de acessos
* Gerenciamento de status acadêmico

## Estrutura do Banco de Dados

### alunos

Armazena informações dos alunos cadastrados.

### logs_acesso

Registra todas as leituras RFID e eventos de acesso.

### presencas

Controla entradas, saídas e frequência dos alunos.

### usuarios_sistema

Usuários responsáveis pela administração do sistema.

## Fluxo de Funcionamento

1. O aluno aproxima o cartão RFID do leitor.
2. O Arduino realiza a leitura da tag.
3. A Raspberry Pi recebe a informação através da comunicação serial.
4. A API Flask valida os dados no PostgreSQL.
5. O sistema registra o evento.
6. O dashboard é atualizado em tempo real.
7. LEDs e buzzer fornecem feedback ao usuário.

## Possíveis Evoluções

* Display LCD para mensagens ao usuário
* Integração com sistemas acadêmicos
* Notificações automáticas
* Dashboards analíticos
* Controle de acesso por sala
* Integração com aplicativos móveis

Uma evolução estudada para futuras versões consiste na utilização de leitores RFID instalados diretamente nas salas de aula, permitindo controle de presença e acesso por ambiente sem a necessidade de catracas.

## Equipe

* Julia Miranda
* Maria Carolina Pegoraro
* Alisson de Morais Bosa

## Licença

Projeto desenvolvido para fins acadêmicos e educacionais.
