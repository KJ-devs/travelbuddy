import requests

# URL de l'API ou du site web
url = 'https://api.example.com/data'

# Faire une requête GET
response = requests.get(url)

# Vérifier si la requête a réussi
if response.status_code == 200:
    print("Réponse réussie!")
    # Accéder au contenu de la réponse (en format JSON par exemple)
    data = response.json()
    print(data)
else:
    print(
        f"Erreur {response.status_code}: Impossible de récupérer les données.")
