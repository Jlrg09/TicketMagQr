from flask_mail import Message
from os import getenv
from dotenv import load_dotenv
from database import session_config, Configuracion

def sendMessage(mail, user, name):
    load_dotenv()

    config = session_config.query(Configuracion).first()
    
    sender_email = config.email_envio if config else getenv('MAIL_USERNAME')
    
    email_subject = config.email_asunto if config and config.email_asunto else 'Codigo QR Chico Talento'
    email_body = config.email_cuerpo if config and config.email_cuerpo else '¡Hola! {name} Gracias por tu compra, con el siguiente código puedes confirmar tu entrada al evento de chico talento que se estará realziando el día 11 de Abril del 2024 a las 5:00PM en el emiciclo Helado de Leche.'
    
    email_body = email_body.replace('{name}', name)
    
    msg = Message(email_subject, sender=sender_email, recipients=[user])
    msg.body = email_body

    with open('archivo.pdf', 'rb') as fp:
        msg.attach('archivo.pdf', 'application/pdf', fp.read())

    mail.send(msg)