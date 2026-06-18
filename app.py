from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from datetime import datetime, time

app = Flask(__name__)
CORS(app)

def connect_db():
    return psycopg2.connect(
        host="localhost",
        database="rfid_monitoramento",
        user="postgres",
        password="123456" 
    )

def registrar_log(cursor, tipo, tag_rfid, status, mensagem, nome=None, matricula=None):
    cursor.execute("""
        INSERT INTO logs_acesso
        (tipo, nome, matricula, tag_rfid, status, mensagem)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (tipo, nome, matricula, tag_rfid, status, mensagem))

def calcular_presencas(entrada, saida):
    periodos = [
        (time(19, 0), time(20, 0)),
        (time(20, 0), time(20, 50)),
        (time(21, 0), time(21, 50)),
        (time(21, 50), time(22, 40)),
    ]

    presencas = [False, False, False, False]
    entrada_hora = entrada.time()
    saida_hora = saida.time()

    for i, (inicio, fim) in enumerate(periodos):
        if entrada_hora <= fim and saida_hora >= inicio:
            presencas[i] = True

    return presencas, sum(presencas)

@app.route("/")
def home():
    return jsonify({"mensagem": "API RFID funcionando"})

@app.route("/logs/tempo-real")
def logs_tempo_real():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            nome,
            matricula,
            tipo,
            status,
            timestamp
        FROM logs_acesso
        ORDER BY id DESC
        LIMIT 10
    """)

    logs = cur.fetchall()

    resultado = []

    for log in logs:
        resultado.append({
            "id": log[0],
            "nome": log[1],
            "matricula": log[2],
            "tipo": log[3],
            "status": log[4],
            "timestamp": log[5].strftime("%H:%M:%S")
        })

    return jsonify(resultado)

@app.route("/rfid", methods=["POST"])
def rfid():
    dados = request.get_json()
    tag_rfid = dados.get("tag_rfid") if dados else None

    if not tag_rfid:
        return jsonify({"status": "ERRO", "mensagem": "Tag RFID não enviada"}), 400

    conn = connect_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, nome, matricula, tag_rfid, acesso, ativo, status_matricula
            FROM alunos
            WHERE tag_rfid = %s
        """, (tag_rfid,))

        aluno = cursor.fetchone()

        if not aluno:
            registrar_log(cursor, "TAG NAO CADASTRADA", tag_rfid, "NEGADO",
                          "Cartão RFID não cadastrado no sistema")
            conn.commit()
            return jsonify({
                "status": "TAG NAO CADASTRADA",
                "mensagem": "Cartão RFID não cadastrado no sistema"
            }), 403

        aluno_id, nome, matricula, tag, acesso, ativo, status_matricula = aluno

        if not ativo:
            registrar_log(cursor, "ACESSO NEGADO", tag_rfid, "NEGADO",
                          "Aluno inativo no sistema", nome, matricula)
            conn.commit()
            return jsonify({
                "status": "ACESSO NEGADO",
                "mensagem": "Aluno inativo no sistema",
                "aluno": nome
            }), 403

        if not acesso:
            registrar_log(cursor, "ACESSO NEGADO", tag_rfid, "NEGADO",
                          "Acesso bloqueado", nome, matricula)
            conn.commit()
            return jsonify({
                "status": "ACESSO NEGADO",
                "mensagem": "Acesso bloqueado",
                "aluno": nome
            }), 403

        if status_matricula != "ATIVA":
            registrar_log(cursor, "MATRICULA INATIVA", tag_rfid, "NEGADO",
                          f"Matrícula com status {status_matricula}", nome, matricula)
            conn.commit()
            return jsonify({
                "status": "MATRICULA_INATIVA",
                "mensagem": "Aluno não possui matrícula ativa",
                "status_matricula": status_matricula,
                "aluno": nome
            }), 403

        agora = datetime.now()

        cursor.execute("""
            SELECT id, entrada
            FROM presencas
            WHERE aluno_id = %s
            AND data_aula = CURRENT_DATE
            AND status = 'ABERTA'
            ORDER BY entrada DESC
            LIMIT 1
        """, (aluno_id,))

        presenca_aberta = cursor.fetchone()

        if not presenca_aberta:
            cursor.execute("""
                INSERT INTO presencas
                (aluno_id, nome, matricula, tag_rfid, entrada, status)
                VALUES (%s, %s, %s, %s, %s, 'ABERTA')
            """, (aluno_id, nome, matricula, tag_rfid, agora))

            registrar_log(cursor, "ENTRADA", tag_rfid, "LIBERADO",
                          "Entrada registrada", nome, matricula)
            conn.commit()

            return jsonify({
                "status": "LIBERADO",
                "tipo": "ENTRADA",
                "mensagem": "Entrada registrada",
                "aluno": nome,
                "matricula": matricula
            }), 200

        presenca_id, entrada = presenca_aberta
        saida = agora

        tempo_minutos = round((saida - entrada).total_seconds() / 60, 2)
        presencas, total_presencas = calcular_presencas(entrada, saida)

        cursor.execute("""
            UPDATE presencas
            SET saida = %s,
                tempo_permanencia_minutos = %s,
                presenca_1 = %s,
                presenca_2 = %s,
                presenca_3 = %s,
                presenca_4 = %s,
                total_presencas = %s,
                status = 'FECHADA'
            WHERE id = %s
        """, (
            saida,
            tempo_minutos,
            presencas[0],
            presencas[1],
            presencas[2],
            presencas[3],
            total_presencas,
            presenca_id
        ))

        registrar_log(cursor, "SAIDA", tag_rfid, "REGISTRADO",
                      "Saída registrada", nome, matricula)
        conn.commit()

        return jsonify({
            "status": "REGISTRADO",
            "tipo": "SAIDA",
            "mensagem": "Saída registrada",
            "aluno": nome,
            "matricula": matricula,
            "tempo_permanencia_minutos": tempo_minutos,
            "total_presencas": total_presencas,
            "presenca_1": presencas[0],
            "presenca_2": presencas[1],
            "presenca_3": presencas[2],
            "presenca_4": presencas[3]
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "ERRO", "mensagem": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route("/logs", methods=["GET"])
def listar_logs():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, tipo, nome, matricula, tag_rfid, status, mensagem, timestamp
        FROM logs_acesso
        ORDER BY id DESC
        LIMIT 20
    """)

    logs = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "tipo": row[1],
            "nome": row[2],
            "matricula": row[3],
            "tag_rfid": row[4],
            "status": row[5],
            "mensagem": row[6],
            "timestamp": str(row[7])
        }
        for row in logs
    ])

@app.route("/presencas", methods=["GET"])
def listar_presencas():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, matricula, data_aula, entrada, saida,
               tempo_permanencia_minutos, total_presencas, status
        FROM presencas
        ORDER BY id DESC
        LIMIT 20
    """)

    dados = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "nome": row[1],
            "matricula": row[2],
            "data_aula": str(row[3]),
            "entrada": str(row[4]),
            "saida": str(row[5]),
            "tempo_permanencia_minutos": float(row[6]) if row[6] is not None else None,
            "total_presencas": row[7],
            "status": row[8]
        }
        for row in dados
    ])

@app.route("/alunos", methods=["GET"])
def listar_alunos():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, matricula, curso, tag_rfid, acesso, ativo, status_matricula
        FROM alunos
        ORDER BY id
    """)

    dados = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "nome": row[1],
            "matricula": row[2],
            "curso": row[3],
            "tag_rfid": row[4],
            "acesso": row[5],
            "ativo": row[6],
            "status_matricula": row[7]
        }
        for row in dados
    ])

@app.route("/alunos", methods=["POST"])
def criar_aluno():
    dados = request.get_json()

    nome = dados.get("nome")
    matricula = dados.get("matricula")
    curso = dados.get("curso")
    tag_rfid = dados.get("tag_rfid")

    if not nome or not matricula or not tag_rfid:
        return jsonify({
            "status": "ERRO",
            "mensagem": "Nome, matrícula e tag_rfid são obrigatórios"
        }), 400

    conn = connect_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO alunos
            (nome, matricula, curso, tag_rfid, acesso, ativo, status_matricula)
            VALUES (%s, %s, %s, %s, TRUE, TRUE, 'ATIVA')
            RETURNING id
        """, (nome, matricula, curso, tag_rfid))

        novo_id = cursor.fetchone()[0]
        conn.commit()

        return jsonify({
            "status": "CRIADO",
            "mensagem": "Aluno cadastrado com sucesso",
            "id": novo_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "ERRO", "mensagem": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route("/alunos/<int:id>", methods=["GET", "DELETE"])
def aluno_por_id(id):
    conn = connect_db()
    cursor = conn.cursor()

    try:
        if request.method == "GET":
            cursor.execute("""
                SELECT id, nome, matricula, curso, tag_rfid,
                       acesso, ativo, status_matricula
                FROM alunos
                WHERE id = %s
            """, (id,))

            aluno = cursor.fetchone()

            if not aluno:
                return jsonify({
                    "status": "ERRO",
                    "mensagem": "Aluno não encontrado"
                }), 404

            return jsonify({
                "id": aluno[0],
                "nome": aluno[1],
                "matricula": aluno[2],
                "curso": aluno[3],
                "tag_rfid": aluno[4],
                "acesso": aluno[5],
                "ativo": aluno[6],
                "status_matricula": aluno[7]
            })

        if request.method == "DELETE":
            cursor.execute("""
                DELETE FROM alunos
                WHERE id = %s
                RETURNING id
            """, (id,))

            resultado = cursor.fetchone()

            if not resultado:
                return jsonify({
                    "status": "ERRO",
                    "mensagem": "Aluno não encontrado"
                }), 404

            conn.commit()

            return jsonify({
                "status": "SUCESSO",
                "mensagem": "Aluno removido"
            })

    finally:
        cursor.close()
        conn.close()

@app.route("/alunos/<int:id>/status-matricula", methods=["PUT"])
def alterar_status_matricula(id):
    dados = request.get_json()
    novo_status = dados.get("status_matricula")

    conn = connect_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE alunos
            SET status_matricula = %s
            WHERE id = %s
            RETURNING id, nome, status_matricula
        """, (novo_status, id))

        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({
                "status": "ERRO",
                "mensagem": "Aluno não encontrado"
            }), 404

        conn.commit()

        return jsonify({
            "status": "SUCESSO",
            "id": resultado[0],
            "nome": resultado[1],
            "novo_status": resultado[2]
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "ERRO", "mensagem": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route("/alunos/<int:id>/acesso", methods=["PUT"])
def alterar_acesso(id):
    dados = request.get_json()
    acesso = dados.get("acesso")

    conn = connect_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE alunos
            SET acesso = %s
            WHERE id = %s
            RETURNING id, nome, acesso
        """, (acesso, id))

        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({
                "status": "ERRO",
                "mensagem": "Aluno não encontrado"
            }), 404

        conn.commit()

        return jsonify({
            "status": "SUCESSO",
            "id": resultado[0],
            "nome": resultado[1],
            "acesso": resultado[2]
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "ERRO", "mensagem": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route("/alunos/<int:id>/ativo", methods=["PUT"])
def alterar_ativo(id):
    dados = request.get_json()
    ativo = dados.get("ativo")

    conn = connect_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE alunos
            SET ativo = %s
            WHERE id = %s
            RETURNING id, nome, ativo
        """, (ativo, id))

        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({
                "status": "ERRO",
                "mensagem": "Aluno não encontrado"
            }), 404

        conn.commit()

        return jsonify({
            "status": "SUCESSO",
            "id": resultado[0],
            "nome": resultado[1],
            "ativo": resultado[2]
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "ERRO", "mensagem": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route("/dashboard", methods=["GET"])
def dashboard():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM alunos")
    total_alunos = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM presencas
        WHERE data_aula = CURRENT_DATE
    """)
    presencas_hoje = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM logs_acesso
        WHERE status = 'LIBERADO'
    """)
    acessos_liberados = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM logs_acesso
        WHERE status = 'NEGADO'
    """)
    acessos_negados = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return jsonify({
        "total_alunos": total_alunos,
        "presencas_hoje": presencas_hoje,
        "acessos_liberados": acessos_liberados,
        "acessos_negados": acessos_negados
    })

@app.route("/alunos/<int:id>/historico", methods=["GET"])
def historico_alunos(id):
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT data_aula, entrada, saida, tempo_permanencia_minutos, total_presencas
        FROM presencas
        WHERE aluno_id = %s
        ORDER BY data_aula DESC
    """, (id,))

    dados = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([
        {
            "data_aula": str(row[0]),
            "entrada": str(row[1]),
            "saida": str(row[2]),
            "tempo_permanencia_minutos": float(row[3]) if row[3] else 0,
            "total_presencas": row[4]
        }
        for row in dados
    ])

@app.route("/faltosos", methods=["GET"])
def faltosos():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.id, c.nome, c.matricula
        FROM alunos c
        LEFT JOIN presencas p
        ON c.id = p.aluno_id
        AND p.data_aula = CURRENT_DATE
        WHERE p.id IS NULL
    """)

    dados = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "nome": row[1],
            "matricula": row[2]
        }
        for row in dados
    ])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)