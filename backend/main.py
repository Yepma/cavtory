import os
from dotenv import load_dotenv
load_dotenv()
import json
import google.generativeai as genai
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
import schemas
import auth
from typing import List
from uuid import UUID

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cavtory API")

gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

frontend_url = os.environ.get("FRONTEND_URL", "https://your-frontend-name.up.railway.app")

# Add your new public frontend URL to this list
origins = [
    "http://localhost:5173", # Keeps local development working
    "http://localhost:3000", # Alternative Vite/React local dev port
    frontend_url # IMPORTANT: Replace with your actual frontend URL (no trailing slash) or set FRONTEND_URL env var
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Cavtory API"}

# Authentication Endpoints
@app.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(username=user_data.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(request: Request, db: Session = Depends(get_db)):
    # Support both OAuth2 form data and JSON body
    username = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        username = body.get("username")
        password = body.get("password")
    else:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password required"
        )

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Product Endpoints
@app.get("/products", response_model=List[schemas.Product])
def get_products(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Product).filter(models.Product.user_id == current_user.id).all()

@app.post("/products", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.barcode_id == product.barcode_id,
        models.Product.user_id == current_user.id
    ).first()
    if db_product:
        raise HTTPException(status_code=400, detail="Product with this barcode already exists in your inventory")
    
    new_product = models.Product(**product.model_dump(), user_id=current_user.id)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.put("/products/{barcode_id}", response_model=schemas.Product)
def update_product_quantity(
    barcode_id: str,
    product_update: schemas.ProductUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.barcode_id == barcode_id,
        models.Product.user_id == current_user.id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.quantity = product_update.quantity
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{barcode_id}/details", response_model=schemas.Product)
def update_product_details(
    barcode_id: str,
    updates: schemas.ProductDetailsUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.barcode_id == barcode_id,
        models.Product.user_id == current_user.id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.name = updates.name
    db_product.brand = updates.brand
    db_product.size = updates.size
    db_product.category = updates.category
    db_product.product_type = updates.product_type
    
    db.commit()
    db.refresh(db_product)
    return db_product

@app.post("/products/{barcode_id}/consume", response_model=schemas.Product)
def consume_product(
    barcode_id: str,
    payload: schemas.ConsumptionRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.barcode_id == barcode_id,
        models.Product.user_id == current_user.id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if db_product.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    db_product.quantity -= payload.quantity
    
    log = models.ConsumptionLog(
        barcode_id=barcode_id,
        quantity_consumed=payload.quantity,
        user_id=current_user.id
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_product)
    return db_product

# Shopping List Endpoints
@app.get("/lists", response_model=List[schemas.ShoppingList])
def get_lists(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.ShoppingList).filter(models.ShoppingList.user_id == current_user.id).all()

@app.post("/lists", response_model=schemas.ShoppingList, status_code=status.HTTP_201_CREATED)
def create_list(
    shopping_list: schemas.ShoppingListCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    new_list = models.ShoppingList(name=shopping_list.name, user_id=current_user.id)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return new_list

@app.put("/lists/{list_id}/archive", response_model=schemas.ShoppingList)
def archive_list(
    list_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_list = db.query(models.ShoppingList).filter(
        models.ShoppingList.id == list_id,
        models.ShoppingList.user_id == current_user.id
    ).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    if db_list.status == "archived":
        raise HTTPException(status_code=400, detail="List is already archived")
        
    db_list.status = "archived"
    
    for item in db_list.items:
        if item.bought:
            db_product = db.query(models.Product).filter(
                models.Product.barcode_id == item.barcode_id,
                models.Product.user_id == current_user.id
            ).first()
            if db_product:
                db_product.quantity += item.entry_qty
            
    db.commit()
    db.refresh(db_list)
    return db_list

@app.post("/lists/{list_id}/items", response_model=schemas.ListItem, status_code=status.HTTP_201_CREATED)
def add_list_item(
    list_id: UUID,
    item: schemas.ListItemCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_list = db.query(models.ShoppingList).filter(
        models.ShoppingList.id == list_id,
        models.ShoppingList.user_id == current_user.id
    ).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
        
    db_product = db.query(models.Product).filter(
        models.Product.barcode_id == item.barcode_id,
        models.Product.user_id == current_user.id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.barcode_id == item.barcode_id
    ).first()

    if existing_item:
        existing_item.entry_qty = item.entry_qty
        db.commit()
        db.refresh(existing_item)
        return existing_item
    else:
        new_item = models.ListItem(list_id=list_id, barcode_id=item.barcode_id, entry_qty=item.entry_qty)
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

@app.delete("/lists/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list_item(
    list_id: UUID,
    item_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_list = db.query(models.ShoppingList).filter(
        models.ShoppingList.id == list_id,
        models.ShoppingList.user_id == current_user.id
    ).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    db_item = db.query(models.ListItem).filter(
        models.ListItem.id == item_id,
        models.ListItem.list_id == list_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="List item not found")
    
    db.delete(db_item)
    db.commit()
    return None

@app.put("/lists/{list_id}/items/{item_id}/toggle", response_model=schemas.ListItem)
def toggle_list_item(
    list_id: UUID,
    item_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_list = db.query(models.ShoppingList).filter(
        models.ShoppingList.id == list_id,
        models.ShoppingList.user_id == current_user.id
    ).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    db_item = db.query(models.ListItem).filter(
        models.ListItem.id == item_id,
        models.ListItem.list_id == list_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="List item not found")
    
    db_item.bought = not db_item.bought
    db.commit()
    db.refresh(db_item)
    return db_item

@app.post("/scan")
def scan_image(
    payload: schemas.ImagePayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        db_categories = [cat[0] for cat in db.query(models.Product.category).filter(models.Product.user_id == current_user.id).distinct().all() if cat[0]]
        base_categories = ["Cooking", "House Cleaning", "Personal Care", "Meds/Supplies"]
        
        combined_categories = list(set(base_categories + db_categories))
        categories_str = ", ".join(combined_categories)
        
        prompt = f"""Act as a barcode scanner and product recognizer. Analyze the image and extract product information.
You must return a JSON object with the following schema:
{{
  "barcode": "string",
  "name": "string",
  "brand": "string",
  "size": "string",
  "category": "string (must be one of: {categories_str})",
  "product_type": "string (e.g., 'dishwasher', 'glass cleaner', 'cereal', etc. based on the product)"
}}"""
        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": payload.base64_image},
            prompt
        ], generation_config={"response_mime_type": "application/json"})
        
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Error scanning image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan image: {str(e)}")
