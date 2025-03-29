from flask import Flask, render_template, redirect, jsonify, flash, send_file, request
from os import getenv
from database import *
from datetime import timedelta, datetime
from flask_mail import Mail
from mailManager import sendMessage
from dotenv import load_dotenv
from flask import session as cloud

from pdfGeneratorCh import Generator

app = Flask(__name__)

app.config['SECRET_KEY']= '54HjasG|238@ja_idsu-'

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SLS'] = False
app.config['MAIL_USERNAME'] = 'systeplusunimag@gmail.com'
app.config['MAIL_PASSWORD'] = 'eluk npmx udlc amqe'
mail = Mail()

Base.metadata.create_all(engine)
mail.init_app(app)

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
            Generator(int(data["tickets"]))
            #sendMessage(mail, data['email'], data['fullname'])
            return jsonify(response = "success", message = "Código(s) envíados al destinatario")
        except Exception as e:
            print(e)
            return jsonify(respose = "failed", message = "No lo envía")
    return jsonify(response = "failed", message = "Sin acceso al sistema")

@app.route("/scan/<string:qr>")
def verifyQr(qr):

    if validateSession():
        code = session.query(Codigo).filter(Codigo.id == qr).first()

        if code != None and code.usado == False:
            code.usado = True
            session.add(code)
            session.commit()

            return f"Boleto #{code.boleto} válido"
    return "Este boleto no es válido para el ingreso"

@app.route('/login', methods=['POST'])
def login():

    if request.method == 'POST':
        data = request.form

        if data['email'] == 'syste+@gmail.com' and data['password'] == 'syste+2024':
            cloud['valid'] = True
            return redirect("/home")
    return redirect('/')


@app.route("/copy/database")
def copyDatabase():
    if validateSession():
        return send_file("database.db")
    else:
        return "Nooo"


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000, load_dotenv=True)