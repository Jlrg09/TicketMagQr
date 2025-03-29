from sqlalchemy import String, Boolean, Column, Integer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from uuid import uuid4

url = "sqlite:///database.db"

engine = create_engine(url)

Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()

class Codigo(Base):

    __tablename__ = "Codigos"

    boleto = Column(Integer, nullable=False, primary_key=True ,autoincrement=True)
    id = Column(String, nullable= False)
    usado = Column(Boolean, nullable=False)
    vip = Column(Boolean, nullable = False)
    

    def __init__(self, vip=False):
        self.id = str(uuid4())
        self.usado = False
        self.boleto = session.query(Codigo).count() + 1
        self.vip = vip
