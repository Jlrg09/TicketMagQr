from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
#from rotatedText import verticalText
from database import *
import qrcode


class Generator():

    def __init__(self, qrs, ticket):
        self.width, self.height = A4
        self.ticket = ticket
        self.qrs = qrs
    
    def generatePdf(self):
        cuadricule = canvas.Canvas("archivo.pdf", pagesize=letter)

        pictures = []

        for i in range(1, self.qrs+1):
            if self.ticket == 'vip':
                code = self.generateQr(True)
            else:
                code = self.generateQr()

            pictures.append(code[0])
            num = generateNum(code[1])

            cuadricule.drawImage(f"{self.ticket}.png", x=0, y=0, width=self.width+15, height=self.height-30)
            cuadricule.drawImage(code[0], x=self.width/4 + 7.5, y = self.height/6 - 10, width=self.width/2, height=self.height/3.2)

            cuadricule.setFont("Helvetica-Bold", 40)
            cuadricule.drawString(x=40, y= self.height-100,text=num, charSpace=1)

            print(num)
            cuadricule.showPage()

        print(pictures)

        cuadricule.save()

        return pictures


    def generateQr(self, vip=False):
        code = Codigo(vip)
        session.add(code)
        session.commit()

        txt = f'{code.id}'
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=7, border=2)
        qr.add_data(txt)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        img.save(f"qrs/{code.id}.png")
        return f"qrs/{code.id}.png", code.boleto
    
def generateNum(num:int):
    numTxt = str(num)
    return (4-len(numTxt)) * "0" + numTxt 

