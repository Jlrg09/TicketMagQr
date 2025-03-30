import bcrypt
from sqlalchemy import create_engine, Column, String, Integer, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base


# Base de datos para códigos QR
engine_codigos = create_engine("sqlite:///codigos.db")
SessionCodigos = sessionmaker(bind=engine_codigos)
session_codigos = SessionCodigos()
BaseCodigos = declarative_base()

# Base de datos para credenciales
engine_credenciales = create_engine("sqlite:///credenciales.db")
SessionCredenciales = sessionmaker(bind=engine_credenciales)
session_credenciales = SessionCredenciales()
BaseCredenciales = declarative_base()

# Definir modelos
class Codigo(BaseCodigos):
    __tablename__ = "Codigos"
    boleto = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(String, nullable=False, unique=True)
    usado = Column(Boolean, nullable=False, default=False)
    vip = Column(Boolean, nullable=False, default=False)

class Usuario(BaseCredenciales):
    __tablename__ = "Usuarios"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    def __init__(self, email, password):
        # Solo hashear si la contraseña no está en formato bcrypt
        if not password.startswith("$2b$"):
            password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        print(f"Contraseña antes de guardar: {password}")  # Depuración
        self.email = email
        self.password = password


# Crear las tablas si no existen
BaseCodigos.metadata.create_all(engine_codigos)
BaseCredenciales.metadata.create_all(engine_credenciales)