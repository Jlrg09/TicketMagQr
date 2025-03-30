import os
import io
import bcrypt
import pandas as pd
from flask import Flask, render_template, redirect, request, flash, jsonify, send_file, session
from flask import session as cloud
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash
from bcrypt import checkpw
from os import getenv
from dotenv import load_dotenv
from datetime import timedelta, datetime

from database import (
    session_credenciales, session_codigos, session_config, 
    Usuario, Codigo, Configuracion, 
    BaseCodigos, BaseCredenciales, BaseConfig, 
    engine_codigos, engine_credenciales, engine_config
)
from mailManager import sendMessage
from pdfGeneratorCh import Generator


load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = getenv('SECRET_KEY')
app.config['SESSION_PERMANENT'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=1) 
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False

# Obtener configuración de email desde BD o usar variables de entorno como respaldo
config = session_config.query(Configuracion).first()
if config:
    app.config['MAIL_USERNAME'] = config.email_envio
    app.config['MAIL_PASSWORD'] = config.clave_aplicacion
else:
    app.config['MAIL_USERNAME'] = getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = getenv('MAIL_PASSWORD')
    if getenv('MAIL_USERNAME') and getenv('MAIL_PASSWORD'):
        nueva_config = Configuracion(getenv('MAIL_USERNAME'), getenv('MAIL_PASSWORD'))
        session_config.add(nueva_config)
        session_config.commit()

mail = Mail(app) 

def validateSession():
    return 'valid' in cloud

def validateAdminSession():
    return 'valid' in cloud and 'is_admin' in cloud and cloud['is_admin'] == True

@app.route("/")
def index():
    if validateSession():
        if validateAdminSession():
            return redirect("/admin")
        return redirect("/home")
    return render_template("index.html")


@app.route("/home")
def home():
    if validateSession():
        return render_template("home.html")
    return redirect("/")


@app.route("/admin")
def admin():
    if validateAdminSession():
        return render_template("admin.html")
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
    code = session_codigos.query(Codigo).filter(Codigo.id == qr).first()

    if code != None and code.usado == False:
        code.usado = True
        session_codigos.add(code)
        session_codigos.commit()

        message = f"Boleto #{code.boleto} normal, acceso permitido" if code.vip == False else f"Boleto #{code.boleto} V.I.P dile al cliente que reclame su extra"

        return jsonify(status = "válido", message = message)
    
    message = "El código no está registrado en plataforma" if code == None else f"El boleto #{code.boleto} ya fue usado"
    return jsonify(status = "inválido", message = message)

@app.route('/login', methods=['POST'])
def login():
    if request.method == 'POST':
        data = request.form
        user = session_credenciales.query(Usuario).filter(Usuario.email == data['email']).first()

        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password.encode('utf-8')):
            session['valid'] = True
            session.permanent = False

            if user.is_admin:
                admin_code_input = data.get('admin_code')  
                if admin_code_input and admin_code_input == user.admin_code:
                    session['is_admin'] = True 
                    return redirect("/admin")
                else:
                    flash("Código de administrador incorrecto")
                    return redirect("/")  

            return redirect("/home") 

    return redirect('/')

@app.route('/logout')
def logout():
    cloud.clear() 
    return redirect('/')


@app.route('/admin/create_user', methods=['POST'])
def create_user():
    if not validateAdminSession():
        return jsonify(response="failed", message="Acceso denegado")
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        is_admin = data.get('is_admin', False)
        admin_code = data.get('admin_code') if is_admin else None
        
        existing_user = session_credenciales.query(Usuario).filter(Usuario.email == email).first()
        if existing_user:
            return jsonify(response="failed", message="El usuario ya existe")
        
        nuevo_usuario = Usuario(email=email, password=password, is_admin=is_admin, admin_code=admin_code)
        session_credenciales.add(nuevo_usuario)
        session_credenciales.commit()
        
        return jsonify(response="success", message="Usuario creado con éxito")
    except Exception as e:
        print(e)
        return jsonify(response="failed", message="Error al crear usuario")


@app.route('/admin/get_users')
def get_users():
    if not validateAdminSession():
        return jsonify(response="failed", message="Acceso denegado")
    
    try:
        users = session_credenciales.query(Usuario).all()
        user_list = [{"id": user.id, "email": user.email, "is_admin": user.is_admin} for user in users]
        return jsonify(response="success", users=user_list)
    except Exception as e:
        print(e)
        return jsonify(response="failed", message="Error al obtener usuarios")


@app.route('/admin/get_codes')
def get_codes():
    if not validateAdminSession():
        return jsonify(response="failed", message="Acceso denegado")
    
    try:
        codes = session_codigos.query(Codigo).all()
        code_list = [{"boleto": code.boleto, "id": code.id, "usado": code.usado, "vip": code.vip} for code in codes]
        return jsonify(response="success", codes=code_list)
    except Exception as e:
        print(e)
        return jsonify(response="failed", message="Error al obtener códigos")


@app.route('/admin/update_config', methods=['POST'])
def update_config():
    if not validateAdminSession():
        return jsonify(response="failed", message="Acceso denegado")
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        email_subject = data.get('email_subject')
        email_body = data.get('email_body')
        
        # Actualizar configuración
        config = session_config.query(Configuracion).first()
        if config:
            config.email_envio = email
            if password:  
                config.clave_aplicacion = password
            config.email_asunto = email_subject
            config.email_cuerpo = email_body
        else:
            config = Configuracion(email, password, email_subject, email_body)
            session_config.add(config)
        
        session_config.commit()
        
        # Actualizar configuración de Flask
        app.config['MAIL_USERNAME'] = email
        if password:
            app.config['MAIL_PASSWORD'] = password
        
        # Reiniciar instancia de Mail
        mail.init_app(app)
        
        return jsonify(response="success", message="Configuración actualizada con éxito")
    except Exception as e:
        print(e)
        return jsonify(response="failed", message="Error al actualizar configuración")


@app.route('/admin/export_users')
def export_users():
    if not validateAdminSession():
        return redirect("/")
    
    try:
        users = session_credenciales.query(Usuario).all()
        user_data = [{"ID": user.id, "Email": user.email, "Es Admin": user.is_admin} for user in users]
        
        df = pd.DataFrame(user_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Usuarios', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name='usuarios.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        print(e)
        flash("Error al exportar usuarios")
        return redirect("/admin")


@app.route('/admin/export_codes')
def export_codes():
    if not validateAdminSession():
        return redirect("/")
    
    try:
        codes = session_codigos.query(Codigo).all()
        code_data = [{"Boleto": code.boleto, "ID": code.id, "Usado": code.usado, "VIP": code.vip} for code in codes]
        
        df = pd.DataFrame(code_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Códigos', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name='codigos.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        print(e)
        flash("Error al exportar códigos")
        return redirect("/admin")


@app.route('/admin/get_config')
def get_config():
    if not validateAdminSession():
        return jsonify(response="failed", message="Acceso denegado")
    
    try:
        config = session_config.query(Configuracion).first()
        if config:
            return jsonify(
                response="success", 
                config={
                    "email": config.email_envio,
                    "email_subject": config.email_asunto,
                    "email_body": config.email_cuerpo
                }
            )
        return jsonify(response="failed", message="No hay configuración disponible")
    except Exception as e:
        print(e)
        return jsonify(response="failed", message="Error al obtener configuración")


if __name__ == "__main__":
    load_dotenv()
    BaseCodigos.metadata.create_all(engine_codigos)
    BaseCredenciales.metadata.create_all(engine_credenciales)
    BaseConfig.metadata.create_all(engine_config)
    mail.init_app(app)
    app.run(debug=True, host="0.0.0.0", port=5000, load_dotenv=True)