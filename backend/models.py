from sqlalchemy import Column, Integer, String, DateTime
from backend import database
import datetime

class FileMeta(database.Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    expiry = Column(DateTime, nullable=False)
    max_downloads = Column(Integer, nullable=True)
    downloads = Column(Integer, default=0) 