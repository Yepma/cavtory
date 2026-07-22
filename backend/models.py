import uuid
import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Uuid, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class Product(Base):
    __tablename__ = "products"

    barcode_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String)
    size = Column(String)
    category = Column(String)
    product_type = Column(String, nullable=True)
    quantity = Column(Integer, default=0)
    last_updated = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, index=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    items = relationship("ListItem", back_populates="shopping_list", cascade="all, delete-orphan")

class ListItem(Base):
    __tablename__ = "list_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    list_id = Column(Uuid(as_uuid=True), ForeignKey("shopping_lists.id"))
    barcode_id = Column(String)
    entry_qty = Column(Integer, default=1)
    bought = Column(Boolean, default=False)

    shopping_list = relationship("ShoppingList", back_populates="items")

class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    barcode_id = Column(String)
    quantity_consumed = Column(Integer)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
