import serial
import requests
import time

PORTA_SERIAL = "/dev/ttyACM0"
BAUD_RATE = 9600
API_URL = "http://127.0.0.1:5000/rfid"

time.sleep(2)

ser = serial.Serial(PORTA_SERIAL, BAUD_RATE, timeout=1)

print("Leitor serial iniciado.")
print("Aguardando tags do Arduino...")

ultima_tag = None
ultimo_tempo = 0

while True:
    try:
        tag = ser.readline().decode("utf-8", errors="ignore").strip()

        if not tag:
            continue

        agora = time.time()

        if tag == ultima_tag and agora - ultimo_tempo < 3:
            continue

        ultima_tag = tag
        ultimo_tempo = agora

        print(f"TAG recebida: {tag}")

        resposta = requests.post(
            API_URL,
            json={"tag_rfid": tag},
            timeout=5
        )

        dados = resposta.json()

        print("Status HTTP:", resposta.status_code)
        print("Resposta:", dados)

        if resposta.status_code == 200:
            ser.write(b"OK\n")
        else:
            ser.write(b"NEGADO\n")

    except Exception as erro:
        print("Erro:", erro)
        time.sleep(2)