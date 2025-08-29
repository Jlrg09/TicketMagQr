import bcrypt
from database import session_credenciales, Usuario, BaseCredenciales, engine_credenciales

admin_email = "administrador@systeplus.com"
admin_password = "administrador"
admin_code = "123456"  

BaseCredenciales.metadata.create_all(engine_credenciales)

existing_user = session_credenciales.query(Usuario).filter(Usuario.email == admin_email).first()

if existing_user:
    print(f"El usuario {admin_email} ya existe.")
    if not existing_user.is_admin:
        existing_user.is_admin = True
        existing_user.admin_code = admin_code
        session_credenciales.commit()
        print(f"Usuario actualizado como administrador con código: {admin_code}")
else:
    hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    nuevo_admin = Usuario(
        email=admin_email, 
        password=hashed_password,
        is_admin=True,
        admin_code=admin_code
    )
    
    session_credenciales.add(nuevo_admin)
    session_credenciales.commit()
    
    print(f"Administrador creado con éxito. Email: {admin_email}, Código admin: {admin_code}")

admin = session_credenciales.query(Usuario).filter(Usuario.email == admin_email).first()
print(f"Administrador en BD: Email={admin.email}, Es admin={admin.is_admin}, Código admin={admin.admin_code}")
