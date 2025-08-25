import bcrypt
from sqlalchemy import Text, create_engine, Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

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

# Base de datos para configuración
engine_config = create_engine("sqlite:///config.db")
SessionConfig = sessionmaker(bind=engine_config)
session_config = SessionConfig()
BaseConfig = declarative_base()

class Codigo(BaseCodigos):
    __tablename__ = "Codigos"
    boleto = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(String, nullable=False, unique=True)
    usado = Column(Boolean, nullable=False, default=False)
    vip = Column(Boolean, nullable=False, default=False)
    email = Column(String, nullable=True)  # Email del destinatario
    fecha_creacion = Column(DateTime, default=datetime.utcnow)  # Fecha de creación
    fecha_uso = Column(DateTime, nullable=True)  # Fecha de uso
    vendedor_id = Column(Integer, nullable=True)  # ID del vendedor que generó el código
    vendedor_email = Column(String, nullable=True)  # Email del vendedor para referencia directa

class Usuario(BaseCredenciales):
    __tablename__ = "Usuarios"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)  
    admin_code = Column(String, nullable=True)  

    def __init__(self, email, password, is_admin=False, admin_code=None):
        if not password.startswith("$2b$"):
            password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        self.email = email
        self.password = password
        self.is_admin = is_admin
        self.admin_code = admin_code

class Configuracion(BaseConfig):
    __tablename__ = 'configuracion'
    
    id = Column(Integer, primary_key=True)
    email_envio = Column(String(120), nullable=False)
    clave_aplicacion = Column(String(120), nullable=False)
    email_asunto = Column(String(255), default='Codigo QR Chico Talento')
    email_cuerpo = Column(Text, default='¡Hola! {name} Gracias por tu compra, con el siguiente código puedes confirmar tu entrada al evento de chico talento que se estará realziando el día 11 de Abril del 2024 a las 5:00PM en el emiciclo Helado de Leche.')
    
    def __init__(self, email_envio, clave_aplicacion, email_asunto=None, email_cuerpo=None):
        self.email_envio = email_envio
        self.clave_aplicacion = clave_aplicacion
        if email_asunto:
            self.email_asunto = email_asunto
        if email_cuerpo:
            self.email_cuerpo = email_cuerpo


BaseCodigos.metadata.create_all(engine_codigos)
BaseCredenciales.metadata.create_all(engine_credenciales)
BaseConfig.metadata.create_all(engine_config)