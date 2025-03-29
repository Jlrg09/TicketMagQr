from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
#from rotatedText import verticalText
from database import *
import qrcode


class Generator():

    def __init__(self, qrs) -> None:
        width, height = A4
        print(A4)
        cuadricule = canvas.Canvas("archivo.pdf", pagesize=letter)

        salt = 0

        for i in range(1, qrs+1):
            num = generateNum(i)
            cuadricule.setFillColorRGB(1, 1, 1)
            cuadricule.drawImage("plantilla.png", x=10, y=(121 * salt) + 5, width=396, height=120)
            cuadricule.drawImage(self.generateQr(num), x=width-302.5, y = 25 + (salt * 121) , width=88, height=88)

            cuadricule.setFont("Helvetica-Bold", 5.3)
            
            cuadricule.drawString(x=329, y= 19 + (salt * 121),text=num, charSpace=1)

            cuadricule.setFont("Helvetica-Bold", 10)
            cuadricule.drawString(45, 48 + (salt * 121), num[3])
            cuadricule.drawString(45, 58 + (salt * 121), num[2])
            cuadricule.drawString(45, 68 + (salt * 121), num[1])
            cuadricule.drawString(45, 78 + (salt * 121), num[0])





            salt += 1
            print(num)

            if salt % 6 == 0:
                cuadricule.showPage()
                salt = 0
        cuadricule.save()


    def generateQr(self, boleto):
        code = Codigo(boleto)
        session.add(code)
        session.commit()

        hostFinal = "191.168.18.236"
        txt = f'{code.id}'
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=7, border=2)
        qr.add_data(txt)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        img.save(f"qrs/{code.id}.png")
        return f"qrs/{code.id}.png"
    
def generateNum(num:int):
    numTxt = str(num)
    return (4-len(numTxt)) * "0" + numTxt 

