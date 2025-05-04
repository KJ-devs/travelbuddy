from flask import Flask, request, jsonify
import json
import datetime
import os
import socket
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Créer un dossier pour stocker les données
data_folder = "air_quality_data"
if not os.path.exists(data_folder):
    os.makedirs(data_folder)

# Fonction pour obtenir l'adresse IP locale


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        return f"Impossible de déterminer l'IP: {e}"


@app.route('/', methods=['GET'])
def index():
    return "Serveur Flask prêt à recevoir des données à /data"


@app.route('/data', methods=['POST', 'GET'])
def receive_data():
    try:
        print("\n--- NOUVELLE REQUÊTE ---")
        print(f"Méthode: {request.method}")
        print(f"Adresse source: {request.remote_addr}")
        print(f"Headers: {request.headers}")

        if request.method == 'GET':
            return jsonify({
                "status": "success",
                "message": "Endpoint actif, utilisez POST pour envoyer des données",
                "server_time": datetime.datetime.now().isoformat()
            }), 200

        print(f"Content-Type: {request.content_type}")
        raw_data = request.get_data()
        print(f"Données brutes: {raw_data}")

        # Tentative de traitement JSON
        if request.is_json:
            data = request.get_json()
        else:
            try:
                data = json.loads(raw_data)
                print("Données parsées manuellement:", data)
            except Exception:
                return jsonify({
                    "status": "error",
                    "message": "Format de données invalide"
                }), 400

        print("Données reçues:", json.dumps(data, indent=2))

        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_folder}/data_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)

        return jsonify({
            "status": "success",
            "message": "Données enregistrées avec succès",
            "saved_to": filename
        }), 200

    except Exception as e:
        print(f"Erreur lors du traitement: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Erreur serveur: {str(e)}"
        }), 500


@app.route("/arduino/getData", methods=["GET"])
def get_data():
    all_data = []
    for filename in sorted(os.listdir(data_folder)):
        if filename.endswith(".json"):
            with open(os.path.join(data_folder, filename), "r") as f:
                try:
                    all_data.append(json.load(f))
                except Exception as e:
                    print(f"Invalid JSON in {filename}: {e}")
    return jsonify(all_data)



if __name__ == '__main__':
    local_ip = get_local_ip()
    print("\n" + "="*50)
    print(f"Serveur Flask démarré sur http://{local_ip}:5000")
    print(f"L'ESP32 doit envoyer les données à: http://{local_ip}:5000/data")
    print("="*50 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
