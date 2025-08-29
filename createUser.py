from database import session_credenciales, Usuario
import bcrypt

password = "admin"

hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

nuevo_usuario = Usuario(email="admin@systeplus.com", password=hashed_password)
session_credenciales.add(nuevo_usuario)
session_credenciales.commit()

print("Usuario creado con éxito")

usuario = session_credenciales.query(Usuario).filter(Usuario.email == "joseromerolg@unimagdalena.edu.co").first()
print("Contraseña almacenada en la BD:", usuario.password)
