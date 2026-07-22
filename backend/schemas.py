from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# User Auth Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

# Product Schemas
class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    size: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None
    quantity: int = 0

class ProductCreate(ProductBase):
    barcode_id: str

class ProductUpdate(BaseModel):
    quantity: int

class ProductDetailsUpdate(BaseModel):
    name: str
    brand: Optional[str] = None
    size: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None

class ConsumptionRequest(BaseModel):
    quantity: int

class Product(ProductBase):
    barcode_id: str
    last_updated: datetime
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# Shopping List Schemas
class ListItemBase(BaseModel):
    barcode_id: str
    entry_qty: int = 1
    bought: bool = False

class ListItemCreate(ListItemBase):
    pass

class ListItem(ListItemBase):
    id: UUID
    list_id: UUID

    model_config = ConfigDict(from_attributes=True)

class ShoppingListBase(BaseModel):
    name: str

class ShoppingListCreate(ShoppingListBase):
    pass

class ShoppingList(ShoppingListBase):
    id: UUID
    status: str
    created_at: datetime
    items: List[ListItem] = []
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ImagePayload(BaseModel):
    base64_image: str
