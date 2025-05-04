from flask import Flask, jsonify
from flask import Flask, request, jsonify, send_from_directory
import json
import datetime
import os
import socket
from flask_cors import CORS

# --- Configuration de l'application Flask ---
app = Flask(
    __name__,
    static_folder="frontend",   # dossier où se trouve dashboard.html
    static_url_path=""          # sert tout le contenu de static_folder à la racine
)
CORS(app)

# --- Dossier de stockage des données ---
data_folder = "air_quality_data"
if not os.path.exists(data_folder):
    os.makedirs(data_folder)

# --- Fonction pour obtenir l'IP locale ---


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        return f"Impossible de déterminer l'IP: {e}"

# --- Routes pour servir le dashboard ---


@app.route('/', methods=['GET'])
@app.route('/dashboard', methods=['GET'])
def serve_dashboard():
    # Sert frontend/dashboard.html pour / et /dashboard
    return send_from_directory(app.static_folder, 'dashboard.html')

# --- Endpoint pour recevoir les données ---


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

        raw_data = request.get_data()
        print(f"Données brutes: {raw_data}")

        # Traitement JSON
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
        print(f"Erreur lors du traitement: {e}")
        return jsonify({
            "status": "error",
            "message": f"Erreur serveur: {e}"
        }), 500

# --- Endpoint pour récupérer les données stockées ---


app = Flask(__name__)
data_folder = "/chemin/vers/ton/dossier"


@app.route('/arduino/getData', methods=['GET'])
def get_data():
    all_data = []

    # Liste des fichiers JSON triés par date de modification (du plus récent au plus ancien)
    files = [
        os.path.join(data_folder, f)
        for f in os.listdir(data_folder)
        if f.endswith(".json")
    ]
    files.sort(key=os.path.getmtime, reverse=True)

    for fpath in files[:120]:  # Limite aux 120 derniers fichiers
        try:
            with open(fpath, "r") as f:
                all_data.append(json.load(f))
        except Exception as e:
            print(f"Invalid JSON in {fpath}: {e}")

    return jsonify(all_data)


# --- Point d'entrée ---
if __name__ == '__main__':
    # Vérification du contenu du dossier frontend/
    print("\n== Contenu du dossier frontend/ ==")
    try:
        for f in os.listdir(app.static_folder):
            print("  -", f)
    except Exception as e:
        print("Erreur lecture frontend/:", e)

    ip = get_local_ip()
    print("\n" + "="*50)
    print(f"Serveur démarré sur http://{ip}:5000")
    print(" → Dashboard : http://<IP>:5000/  ou  http://<IP>:5000/dashboard")
    print(f"Dossier frontend : {app.static_folder}")
    print(f"Endpoint données : http://{ip}:5000/data")
    print("="*50 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
