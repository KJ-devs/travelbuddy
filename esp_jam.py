import network
import time
import json
from machine import ADC, Pin
import dht
import urequests

# Configuration capteur
mq9_sensor = ADC(Pin(36))      # D36 for MQ-9
mq135_sensor = ADC(Pin(39))    # D39 for MQ-135
mq9_sensor.atten(ADC.ATTN_11DB)
mq135_sensor.atten(ADC.ATTN_11DB)
dht_sensor = dht.DHT22(Pin(21))  # D21 for DHT22

#calibration
MQ9_RL = 10.0
MQ9_R0 = 9.8
MQ9_CO_A = 599.65
MQ9_CO_B = -2.128

MQ135_RL = 10.0
MQ135_R0 = 76.63
MQ135_CO2_A = 110.47
MQ135_CO2_B = -2.862

# Configuration WiFi
SSID = "UNAMED5002"
PASSWORD = "faitchier"  
wlan = network.WLAN(network.STA_IF)

# Configuration API
API_ENDPOINT = "http://192.168.99.14:5000/data"  
API_KEY = ""

# Wifi retry connexion varaible
WIFI_RETRY_INTERVAL = 60 
last_wifi_attempt = 0

def connect_wifi():
    """Se connecte au réseau WiFi avec gestion d'erreur"""
    print("Tentative de connexion au WiFi...")
    try:
        wlan.active(True)
        if not wlan.isconnected():
            wlan.connect(SSID, PASSWORD)
            # connexion with timeout
            max_wait = 10
            while max_wait > 0:
                if wlan.isconnected():
                    break
                max_wait -= 1
                print("Tentative de connexion...")
                time.sleep(1)
        
        if wlan.isconnected():
            print("Connecté au WiFi!")
            print("Adresse IP:", wlan.ifconfig()[0])
            return True
        else:
            print("Échec de la connexion WiFi")
            return False
    except Exception as e:
        print(f"Erreur lors de la connexion WiFi: {e}")
        return False

def calculate_gas_concentration(sensor_value, rl_value, r0, a, b, temp, hum):
    """Calcule la concentration de gaz en ppm avec correction T/H"""
    # don't use 
    voltage = sensor_value * 3.3 / 4095.0
    
    # don't use 
    if voltage == 0:
        return 0
    
    rs = rl_value * (3.3 - voltage) / voltage
    
    # ppm ration 
    ratio = rs / r0
    if ratio <= 0:
        return 0
    
    ppm = a * pow(ratio, b)
    
    # Correction temp and hulmidity ( not necessary)
    if temp < 20:
        temp_factor = 1 - (20 - temp) * 0.01
    else:
        temp_factor = 1 + (temp - 20) * 0.01
        
    hum_factor = 1 + (hum - 65) * 0.002
    
    return ppm * temp_factor / hum_factor

def calculate_air_quality_score(co_ppm, co2_ppm, temp, hum):
    """Calcule une note globale de qualité d'air sur 100"""
    # Scoring for CO (40% de la note totale)
    if co_ppm >= 50:
        co_score = 0
    else:
        co_score = 100 - (co_ppm * 2)
    
    # Scoring for CO2 (40% de la note totale)
    if co2_ppm <= 400:
        co2_score = 100
    elif co2_ppm >= 2500:
        co2_score = 0
    else:
        co2_score = 100 - ((co2_ppm - 400) / 21)
    
    # Scoring for température (10% de la note totale)
    if 20 <= temp <= 24:
        temp_score = 100
    elif temp < 15 or temp > 30:
        temp_score = 0
    elif temp < 20:
        temp_score = 100 - (20 - temp) * 20
    else:  # temp > 24
        temp_score = 100 - (temp - 24) * 16.7
    
    # Scoring for humidity (10% de la note totale)
    if 40 <= hum <= 60:
        hum_score = 100
    elif hum < 20 or hum > 80:
        hum_score = 0
    elif hum < 40:
        hum_score = 100 - (40 - hum) * 5
    else:  # hum > 60
        hum_score = 100 - (hum - 60) * 5
    
    # Calcul note global
    total_score = (co_score * 0.4) + (co2_score * 0.4) + (temp_score * 0.1) + (hum_score * 0.1)
    
    return round(total_score), co_score, co2_score, temp_score, hum_score

def get_air_quality_description(score):
    """Retourne une description de la qualité d'air basée sur le score"""
    if score >= 90:
        return "EXCELLENTE"
    elif score >= 80:
        return "TRES BONNE"
    elif score >= 70:
        return "BONNE"
    elif score >= 60:
        return "ACCEPTABLE"
    elif score >= 50:
        return "MOYENNE"
    elif score >= 40:
        return "MEDIOCRE"
    elif score >= 30:
        return "MAUVAISE"
    elif score >= 20:
        return "TRES MAUVAISE"
    else:
        return "DANGEREUSE"

def create_json_payload(co_ppm, co2_ppm, temp, hum, air_quality_score, quality_description):
    """Crée un objet JSON simple avec les données des capteurs"""
    # Json parser
    data = {
        "timestamp": time.time(),
        "device_id": "esp32_air_monitor_1",
        "sensors": {
            "co": {
                "value": round(co_ppm, 2),
                "unit": "ppm"
            },
            "co2": {
                "value": round(co2_ppm),
                "unit": "ppm"
            },
            "temperature": {
                "value": round(temp, 1),
                "unit": "C"
            },
            "humidity": {
                "value": round(hum, 1),
                "unit": "%"
            }
        },
        "air_quality": {
            "score": air_quality_score,
            "description": quality_description
        }
    }
    
    return json.dumps(data)

def send_data_to_server(payload):
    """Envoie les données au serveur et gère les erreurs"""
    if not wlan.isconnected():
        return False, "Non connecté au WiFi"
    
    try:
        headers = {
            'Content-Type': 'application/json',
            #'X-API-Key': API_KEY
        }
        response = urequests.post(API_ENDPOINT, data=payload, headers=headers)
        status_code = response.status_code
        response.close()  # to make the ress free
        
        if 200 <= status_code < 300:
            return True, f"Réponse: {status_code}"
        else:
            return False, f"Erreur HTTP: {status_code}"
            
    except Exception as e:
        return False, f"Erreur: {e}"

# Programme principal
print("Système de surveillance de la qualité de l'air")
print("---------------------------------------------")
print("Ce programme continue à fonctionner même sans connexion WiFi")
print("Les données seront envoyées lorsque la connexion sera disponible")
print("---------------------------------------------")

# Première tentative de connexion WiFi
wifi_connected = connect_wifi()
last_wifi_attempt = time.time()

print("Démarrage des capteurs...")

# Boucle principale
try:
    while True:
        # Vérifier si on doit réessayer la connexion WiFi
        current_time = time.time()
        if not wifi_connected and (current_time - last_wifi_attempt) > WIFI_RETRY_INTERVAL:
            print("Nouvelle tentative de connexion WiFi...")
            wifi_connected = connect_wifi()
            last_wifi_attempt = current_time
        
        # Lecture des valeurs des capteurs
        mq9_value = mq9_sensor.read()
        mq135_value = mq135_sensor.read()
        
        # Obtenir température et humidité
        try:
            dht_sensor.measure()
            temp = dht_sensor.temperature()
            hum = dht_sensor.humidity()
        except Exception as e:
            print("Erreur DHT22:", e)
            temp = 25.0  # Valeurs par défaut
            hum = 50.0
        
        # Calcul des concentrations de gaz
        co_ppm = calculate_gas_concentration(
            mq9_value, MQ9_RL, MQ9_R0, MQ9_CO_A, MQ9_CO_B, temp, hum
        )
        
        co2_ppm = calculate_gas_concentration(
            mq135_value, MQ135_RL, MQ135_R0, MQ135_CO2_A, MQ135_CO2_B, temp, hum
        )
        
        # Calcul du score de qualité d'air
        air_quality_score, co_score, co2_score, temp_score, hum_score = calculate_air_quality_score(
            co_ppm, co2_ppm, temp, hum
        )
        quality_description = get_air_quality_description(air_quality_score)
        
        # Création du payload JSON
        payload = create_json_payload(
            co_ppm, co2_ppm, temp, hum, air_quality_score, quality_description
        )
        
        # Obtenir l'heure locale formatée
        t = time.localtime()
        time_str = "{:04d}/{:02d}/{:02d} {:02d}:{:02d}:{:02d}".format(
            t[0], t[1], t[2], t[3], t[4], t[5]
        )
        
        # Vérifier l'état de la connexion WiFi
        if wlan.isconnected():
            wifi_connected = True
            wifi_status = "Connecté - " + wlan.ifconfig()[0]
        else:
            wifi_connected = False
            wifi_status = "Déconnecté"
        
        # Affichage des logs classiques
        print("\n=== LOGS CLASSIQUES ===")
        print(f"Date et heure: {time_str}")
        print(f"Statut WiFi: {wifi_status}")
        
        print(f"\nQUALITÉ DE L'AIR: {air_quality_score}/100 - {quality_description}")
        print("\nDétails des mesures:")
        print(f"  • CO: {co_ppm:.2f} ppm (score: {co_score:.0f}/100)")
        print(f"  • CO2: {co2_ppm:.0f} ppm (score: {co2_score:.0f}/100)")
        print(f"  • Température: {temp:.1f} °C (score: {temp_score:.0f}/100)")
        print(f"  • Humidité: {hum:.1f} % (score: {hum_score:.0f}/100)")
        
        # Affichage du JSON
        print("\n=== FORMAT JSON ===")
        print(payload)
        
        # Envoi des données si connecté au WiFi
        if wifi_connected:
            success, message = send_data_to_server(payload)
            if success:
                print(f"\nDonnées envoyées avec succès. {message}")
            else:
                print(f"\nÉchec de l'envoi des données: {message}")
        else:
            print("\nMesures enregistrées localement (pas d'envoi - WiFi déconnecté)")
            print(f"Prochaine tentative de connexion dans {int((WIFI_RETRY_INTERVAL - (current_time - last_wifi_attempt)) / 60)} minutes")
        
        print("\n---------------------------------------------")
        
        # Attente avant la prochaine lecture
        time.sleep(30)
        
except KeyboardInterrupt:
    print("\nProgramme arrêté par l'utilisateur")