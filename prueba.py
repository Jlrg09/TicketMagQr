from flask import Flask
from dotenv import load_dotenv
import os

# Cargar variables desde .env
load_dotenv()

app = Flask(__name__)

# Obtener la clave secreta
app.config['SECRET_KEY'] = os.getenv('MAIL_PASSWORD')

# Comprobar si la clave fue cargada correctamente
if not app.config['SECRET_KEY']:
    raise RuntimeError("SECRET_KEY no está definida. Verifica el archivo .env.")

print("SECRET_KEY cargada correctamente:", app.config['SECRET_KEY'])
