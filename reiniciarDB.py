from database import BaseCredenciales, engine_credenciales
BaseCredenciales.metadata.drop_all(engine_credenciales)
BaseCredenciales.metadata.create_all(engine_credenciales)
print("Base de datos reiniciada.")