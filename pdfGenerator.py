from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
import qrcode
from database import session_codigos, Codigo
import os
from datetime import datetime


class Generator:
    def __init__(self, qrs, ticket):
        """
        Inicializa el generador de PDFs con códigos QR.
        
        Args:
            qrs: Número de códigos QR a generar
            ticket: Tipo de boleto ('vip' o 'normal')
        """
        self.width, self.height = A4
        self.ticket = ticket
        self.qrs = qrs
    
    def generatePdf(self):
        """
        Genera un PDF con los códigos QR.
        
        Returns:
            list: Lista de rutas de las imágenes QR generadas
        """
        cuadricule = canvas.Canvas("archivo.pdf", pagesize=letter)
        pictures = []

        for i in range(1, self.qrs + 1):
            if self.ticket == 'vip':
                code = self.generateQr(True)
            else:
                code = self.generateQr()

            pictures.append(code[0])
            num = generateNum(code[1])

            cuadricule.drawImage(f"{self.ticket}.png", x=0, y=0, width=self.width+15, height=self.height-30)
            cuadricule.drawImage(code[0], x=self.width/4 + 7.5, y=self.height/6 - 10, width=self.width/2, height=self.height/3.2)

            cuadricule.setFont("Helvetica-Bold", 40)
            cuadricule.drawString(x=40, y=self.height-100, text=num, charSpace=1)

            print(num)
            cuadricule.showPage()

        cuadricule.save()
        return pictures

    def generateQr(self, vip=False):
        """
        Genera un código QR y lo guarda en la base de datos.
        
        Args:
            vip: Indica si es un boleto VIP
            
        Returns:
            tuple: (ruta_imagen, número_boleto)
        """
        # Crear un nuevo código en la base de datos
        code = Codigo(
            id=os.urandom(8).hex(),
            vip=vip,
            fecha_creacion=datetime.utcnow()
        )
        session_codigos.add(code)
        session_codigos.commit()

        txt = f'{code.id}'
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=7, border=2)
        qr.add_data(txt)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_path = f"qrs/{code.id}.png"
        os.makedirs("qrs", exist_ok=True)
        img.save(img_path)
        
        return img_path, code.boleto


def generateNum(num: int):
    """
    Formatea el número de boleto con ceros a la izquierda.
    
    Args:
        num: Número de boleto
        
    Returns:
        str: Número formateado (ej: "0001")
    """
    return str(num).zfill(4)