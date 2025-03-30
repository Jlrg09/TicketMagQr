from database import session_credenciales, Usuario

user = session_credenciales.query(Usuario).filter(Usuario.email == "syste+@gmail.com").first()
print("Contraseña en BD:", user.password)
