from flask import Flask, render_template, redirect, jsonify, flash, send_file, request
from os import getenv
from database import *
from datetime import timedelta, datetime
from flask_mail import Mail
from mailManager import sendMessage
from dotenv import load_dotenv
from flask import session as cloud
import os


from pdfGeneratorCh import Generator



load_dotenv()

print("MAIL_USERNAME:", getenv('MAIL_USERNAME'))
print("MAIL_PASSWORD:", getenv('MAIL_PASSWORD'))

app = Flask(__name__)

app.config['SECRET_KEY'] = getenv('SECRET_KEY')
app.config['SESSION_PERMANENT'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=1)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = getenv('MAIL_PASSWORD')

mail = Mail(app) 

def validateSession():
    return 'valid' in cloud

@app.route("/")
def index():
    if validateSession():
        return redirect("/home")
    return render_template("index.html")


@app.route("/home")
def home():
    if validateSession():
        return render_template("home.html")
    return redirect("/")


@app.route("/sendQr", methods=["POST"])
def generar():
    if validateSession():
        try:
            data = request.get_json()
            qrs = Generator(int(data["tickets"]), data['ticket']).generatePdf()

            for file in qrs:
                os.remove(os.path.join("", file))
                
            sendMessage(mail, data['email'], data['fullname'])
            return jsonify(response = "success", message = "Código(s) envíados al destinatario")
        except Exception as e:
            print(e)
            return jsonify(respose = "failed", message = "No lo envía")
    return jsonify(response = "failed", message = "Sin acceso al sistema")

@app.route("/scan/<string:qr>")
def verifyQr(qr):

    code = session.query(Codigo).filter(Codigo.id == qr).first()

    if code != None and code.usado == False:
        code.usado = True
        session.add(code)
        session.commit()

        message = f"Boleto #{code.boleto} normal, acceso permitido" if code.vip == False else f"Boleto #{code.boleto} V.I.P dile al cliente que reclame su extra"

        return jsonify(status = "válido", message = message)
    
    message = "El código no está registrado en plataforma" if code == None else f"El boleto #{code.boleto} ya fue usado"
    return jsonify(status = "inválido", message = message)

@app.route('/login', methods=['POST'])
def login():

    if request.method == 'POST':
        data = request.form

        if data['email'] == 'syste+@gmail.com' and data['password'] == 'syste+2024':
            cloud['valid'] = True
            cloud.permanent = False
            return redirect("/home")
    return redirect('/')

@app.route('/logout')
def logout():
    cloud.clear() 
    return redirect('/')

@app.route("/copy/database")
def copyDatabase():
    if validateSession():
        return send_file("database.db")
    else:
        return "Operación denegada"

        
if __name__ == "__main__":
    load_dotenv()
    Base.metadata.create_all(engine)
    mail.init_app(app)
    app.run(debug=True, host="0.0.0.0", port=5000, load_dotenv=True)