from flask_mail import Message
from os import getenv
from dotenv import load_dotenv



def sendMessage(mail, user, name):
    load_dotenv()

    #msg = Message('Codigo QR Chico Talento',sender=getenv('MAIL_USERNAME'),recipients=[user])
    msg = Message('Codigo QR Chico Talento',sender='joseromerolg009@gmail.com', recipients=[user])

    msg.body = f'¡Hola! {name} Gracias por tu compra, con el siguiente código puedes confirmar tu entrada al evento de chico talento que se estará realziando el día 11 de Abril del 2024 a las 5:00PM en el emiciclo Helado de Leche.'

    with open('archivo.pdf', 'rb') as fp:
        msg.attach('archivo.pdf', 'application/pdf', fp.read())

    mail.send(msg)