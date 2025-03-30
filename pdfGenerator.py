from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
import os
import qrcode
from database import session_codigos, Codigo

class Generator:
    def __init__(self, qrs: int) -> None:
        self.width, self.height = A4
        self.qrs = qrs
        self.create_pdf()

    def create_pdf(self):
        cuadricule = canvas.Canvas("archivo.pdf", pagesize=letter)
        salt = 0
        os.makedirs("qrs", exist_ok=True)  

        for i in range(1, self.qrs + 1):
            num = self.generate_num(i)
            cuadricule.setFillColorRGB(1, 1, 1)
            cuadricule.drawImage("plantilla.png", x=10, y=(121 * salt) + 5, width=396, height=120)
            qr_path = self.generate_qr(num)
            cuadricule.drawImage(qr_path, x=self.width - 302.5, y=25 + (salt * 121), width=88, height=88)

            cuadricule.setFont("Helvetica-Bold", 5.3)
            cuadricule.drawString(329, 19 + (salt * 121), num)

            cuadricule.setFont("Helvetica-Bold", 10)
            for idx, char in enumerate(reversed(num)):
                cuadricule.drawString(45, (48 + (idx * 10)) + (salt * 121), char)

            salt += 1
            print(num)

            if salt % 6 == 0:
                cuadricule.showPage()
                salt = 0

        cuadricule.save()

    def generate_qr(self, boleto: str) -> str:
        code = Codigo(id=os.urandom(8).hex(), usado=False, vip=False)
        session_codigos.add(code)
        session_codigos.commit()

        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=7, border=2)
        qr.add_data(code.id)
        qr.make(fit=True)

        img_path = f"qrs/{code.id}.png"
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(img_path)
        return img_path

    @staticmethod
    def generate_num(num: int) -> str:
        return str(num).zfill(4)
