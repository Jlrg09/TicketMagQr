# mailManager.py
from flask_mail import Message
from os import getenv
from dotenv import load_dotenv
from database import session_config, Configuracion

def sendMessage(mail, user, name):
    """
    Envía un correo electrónico con el boleto adjunto al usuario.
    
    Args:
        mail: Instancia de Flask-Mail
        user: Correo electrónico del destinatario
        name: Nombre del cliente para personalizar el mensaje
    
    Returns:
        bool: True si el envío fue exitoso, False en caso contrario
    """
    try:
        load_dotenv()

        # Obtener configuración de email desde la base de datos
        config = session_config.query(Configuracion).first()
        
        sender_email = config.email_envio if config else getenv('MAIL_USERNAME')
        
        email_subject = config.email_asunto if config and config.email_asunto else 'Codigo QR Chico Talento'
        email_body = config.email_cuerpo if config and config.email_cuerpo else '¡Hola! {name} Gracias por tu compra, con el siguiente código puedes confirmar tu entrada al evento de chico talento que se estará realziando el día 11 de Abril del 2024 a las 5:00PM en el emiciclo Helado de Leche.'
        
        # Reemplazar marcadores en el cuerpo del email
        email_body = email_body.replace('{name}', name)
        
        # Crear y enviar mensaje
        msg = Message(email_subject, sender=sender_email, recipients=[user])
        msg.body = email_body

        # Adjuntar el archivo PDF generado
        with open('archivo.pdf', 'rb') as fp:
            msg.attach('archivo.pdf', 'application/pdf', fp.read())

        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Error al enviar correo a {user}: {e}")
        return False