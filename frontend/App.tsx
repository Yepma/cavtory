import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, RecognitionResult, ViewState, ShoppingList, ShoppingListItem } from './types';
import { CategoryBadge } from './components/CategoryBadge';
import { HomeView } from './components/HomeView';
import { VerifyItemsView } from './components/VerifyItemsView';
import { ListsView } from './components/ListsView';
import { LoginView } from './components/LoginView';
import { Home, LogOut } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cavtory_token'));
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  const [inventory, setInventory] = useState<Product[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeScan, setActiveScan] = useState<RecognitionResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [lastUpdatedItem, setLastUpdatedItem] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    barcodeId: '',
    brand: '',
    name: '',
    size: '',
    category: Category.Cooking,
    productType: '',
    quantity: 1
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('cavtory_token');
    setToken(null);
    setInventory([]);
    setShoppingLists([]);
    setError(null);
  };

  const handleLogin = (newToken: string) => {
    localStorage.setItem('cavtory_token', newToken);
    setToken(newToken);
    setError(null);
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const currentToken = localStorage.getItem('cavtory_token') || token;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleLogout();
      throw new Error('Session expired. Please log in again.');
    }
    return response;
  };

  const fetchInventory = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      
      const formatted = data.map((item: any) => ({
        ...item,
        barcodeId: item.barcode_id,
        productType: item.product_type,
        lastUpdated: item.last_updated
      }));
      setInventory(formatted);
    } catch (err: any) {
      if (err.message !== 'Session expired. Please log in again.') {
        setError("Failed to connect to backend (Products).");
      }
    }
  };

  const fetchLists = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/lists`);
      if (!res.ok) throw new Error('Failed to fetch lists');
      const data = await res.json();
      
      const formatted = data.map((item: any) => ({
        ...item,
        createdAt: item.created_at,
        items: item.items ? item.items.map((i: any) => ({
          id: i.id,
          barcodeId: i.barcode_id,
          quantity: i.entry_qty,
          bought: i.bought
        })) : []
      }));
      setShoppingLists(formatted);
    } catch (err: any) {
      if (err.message !== 'Session expired. Please log in again.') {
        setError("Failed to connect to backend (Lists).");
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchInventory();
      fetchLists();
    }
  }, [token]);

  if (!token) {
    return <LoginView apiUrl={API_URL} onLoginSuccess={handleLogin} />;
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLastUpdatedItem(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setPreviewImage(base64);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!previewImage) return;
    
    setIsProcessing(true);
    const imageToAnalyze = previewImage;
    setPreviewImage(null);

    try {
      const res = await authenticatedFetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64_image: imageToAnalyze })
      });
      if (!res.ok) throw new Error('Failed to scan image');
      const result = await res.json();
      processRecognition(result);
    } catch (err) {
      setError("Failed to analyze image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processRecognition = (result: RecognitionResult) => {
    if (!result.barcode) {
      setError("No barcode found. Please try a clearer picture of the barcode.");
      return;
    }

    const existingProduct = inventory.find(p => p.barcodeId === result.barcode);
    
    if (existingProduct) {
      setActiveScan({ ...result, barcode: existingProduct.barcodeId });
      setShowAdjustment(true);
      setShowForm(false);
    } else {
      setActiveScan(result);
      setFormData({
        barcodeId: result.barcode,
        brand: result.brand || '',
        name: result.name || '',
        size: result.size || '',
        category: result.category || Category.Cooking,
        productType: result.product_type || '',
        quantity: 1
      });
      setShowForm(true);
      setShowAdjustment(false);
    }
  };

  const handleManualAdd = (initialName: string) => {
    const manualBarcode = `MANUAL-${Date.now()}`;
    setActiveScan({ barcode: manualBarcode });
    setFormData({
      barcodeId: manualBarcode,
      brand: '',
      name: initialName,
      size: '',
      category: Category.Cooking,
      productType: '',
      quantity: 1
    });
    setShowForm(true);
    setShowAdjustment(false);
  };

  const handleSaveNew = async () => {
    if (!formData.barcodeId || !formData.name) return;
    
    const newProduct = {
      barcode_id: formData.barcodeId as string,
      brand: formData.brand || 'Generic',
      name: formData.name as string,
      size: formData.size || 'N/A',
      category: formData.category as Category,
      product_type: formData.productType || '',
      quantity: Number(formData.quantity) || 0,
    };

    try {
      const res = await authenticatedFetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (!res.ok) throw new Error('Failed to save product');
      
      const savedProduct = await res.json();
      const formattedProduct: Product = {
        ...savedProduct,
        barcodeId: savedProduct.barcode_id,
        lastUpdated: savedProduct.last_updated
      };

      setInventory(prev => [...prev, formattedProduct]);
      setLastUpdatedItem(formattedProduct);
      setShowForm(false);
    } catch (err) {
      setError("Failed to create product on backend.");
    }
  };

  const handleAdjustQuantity = async (type: 'IN' | 'OUT', amount: number) => {
    if (!activeScan?.barcode) return;
    
    const currentProduct = inventory.find(p => p.barcodeId === activeScan.barcode);
    if (!currentProduct) return;

    const newQty = type === 'IN' ? currentProduct.quantity + amount : Math.max(0, currentProduct.quantity - amount);

    try {
      const res = await authenticatedFetch(`${API_URL}/products/${activeScan.barcode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      if (!res.ok) throw new Error('Failed to update product');
      
      const updatedProduct = await res.json();
      const formattedProduct: Product = {
        ...updatedProduct,
        barcodeId: updatedProduct.barcode_id,
        lastUpdated: updatedProduct.last_updated
      };

      setInventory(prev => prev.map(p => p.barcodeId === activeScan.barcode ? formattedProduct : p));
      setLastUpdatedItem(formattedProduct);
      setShowAdjustment(false);
    } catch (err) {
      setError("Failed to update product on backend.");
    }
  };

  const handleEditProduct = async (barcodeId: string, updates: Partial<Product>) => {
    try {
      const payload = {
        name: updates.name,
        brand: updates.brand,
        size: updates.size,
        category: updates.category,
        product_type: updates.productType
      };

      const res = await authenticatedFetch(`${API_URL}/products/${barcodeId}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to update product details');
      
      const updatedProduct = await res.json();
      const formattedProduct: Product = {
        ...updatedProduct,
        barcodeId: updatedProduct.barcode_id,
        productType: updatedProduct.product_type,
        lastUpdated: updatedProduct.last_updated
      };

      setInventory(prev => prev.map(p => p.barcodeId === barcodeId ? formattedProduct : p));
      setLastUpdatedItem(formattedProduct);
    } catch (err) {
      setError("Failed to update product details on backend.");
      throw err;
    }
  };

  const handleConsumeProduct = async (barcodeId: string, quantity: number) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/products/${barcodeId}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to consume product');
      }
      
      const updatedProduct = await res.json();
      const formattedProduct: Product = {
        ...updatedProduct,
        barcodeId: updatedProduct.barcode_id,
        productType: updatedProduct.product_type,
        lastUpdated: updatedProduct.last_updated
      };

      setInventory(prev => prev.map(p => p.barcodeId === barcodeId ? formattedProduct : p));
      setLastUpdatedItem(formattedProduct);
    } catch (err: any) {
      setError(err.message || "Failed to consume product on backend.");
      throw err;
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create list');
      
      const savedList = await res.json();
      const formattedList = {
        ...savedList,
        createdAt: savedList.created_at
      };
      setShoppingLists(prev => [formattedList, ...prev]);
    } catch (err) {
      setError("Failed to create list on backend.");
    }
  };

  const handleAddListItem = async (listId: string, barcodeId: string, quantity: number) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode_id: barcodeId, entry_qty: quantity })
      });
      if (!res.ok) throw new Error('Failed to update list item');
      
      const addedItem = await res.json();
      
      setShoppingLists(prev => prev.map(l => {
        if (l.id === listId) {
          const items = [...l.items];
          const idx = items.findIndex(i => i.barcodeId === barcodeId);
          if (idx >= 0) {
            items[idx] = { ...items[idx], quantity: addedItem.entry_qty, id: addedItem.id };
          } else {
            items.push({ id: addedItem.id, barcodeId: addedItem.barcode_id, quantity: addedItem.entry_qty });
          }
          return { ...l, items };
        }
        return l;
      }));
    } catch (err) {
      setError("Failed to update list item on backend.");
    }
  };

  const handleToggleListItem = async (listId: string, itemId: string) => {
    try {
      if (itemId) {
        const res = await authenticatedFetch(`${API_URL}/lists/${listId}/items/${itemId}/toggle`, {
          method: 'PUT'
        });
        if (!res.ok) throw new Error('Failed to toggle item');
        const updatedItem = await res.json();

        setShoppingLists(prev => prev.map(l => {
          if (l.id === listId) {
            return {
              ...l,
              items: l.items.map(i => i.id === itemId ? { ...i, bought: updatedItem.bought } : i)
            };
          }
          return l;
        }));
      }
    } catch (err) {
      setError("Failed to toggle item status on backend.");
    }
  };

  const handleRemoveListItem = async (listId: string, itemId: string, barcodeId: string) => {
    try {
      if (itemId) {
        const res = await authenticatedFetch(`${API_URL}/lists/${listId}/items/${itemId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to remove item');
      }
      
      setShoppingLists(prev => prev.map(l => {
        if (l.id === listId) {
          return { ...l, items: l.items.filter(i => i.barcodeId !== barcodeId) };
        }
        return l;
      }));
    } catch (err) {
      setError("Failed to remove list item on backend.");
    }
  };

  const handleArchiveList = async (listId: string) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/lists/${listId}/archive`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Failed to archive list');
      
      const updatedList = await res.json();
      const formattedList = {
        ...updatedList,
        createdAt: updatedList.created_at
      };
      
      setShoppingLists(prev => prev.map(l => l.id === listId ? formattedList : l));
      await fetchInventory();
    } catch (err) {
      setError("Failed to archive list on backend.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-neutral-800 selection:text-neutral-200">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-950 font-bold text-base shadow-sm">
              C
            </div>
            <span className="font-medium text-lg text-neutral-100 tracking-tight">Cavtory</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`p-2 rounded-lg transition-colors ${
                currentView === 'home' 
                  ? 'bg-neutral-800 text-neutral-100' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('verify')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'verify' 
                  ? 'bg-neutral-800 text-neutral-100' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              Inventory ({inventory.length})
            </button>
            <button
              onClick={() => setCurrentView('lists')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'lists' 
                  ? 'bg-neutral-800 text-neutral-100' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              Lists ({shoppingLists.length})
            </button>
            
            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors border border-rose-900/30"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*"
          capture="environment"
          className="hidden" 
        />

        {/* Image Preview State */}
        {previewImage && !isProcessing && (
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-medium text-neutral-100 mb-6">Review Photo</h2>
              
              <div className="w-full aspect-[4/3] bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden mb-6 flex items-center justify-center">
                <img 
                  src={`data:image/jpeg;base64,${previewImage}`} 
                  alt="Scanned item preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => {
                    setPreviewImage(null);
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-3 border border-neutral-700 text-neutral-300 text-sm font-medium rounded-xl hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
                >
                  Take Another
                </button>
                <button 
                  onClick={analyzeImage}
                  className="px-4 py-3 bg-neutral-100 text-neutral-900 text-sm font-medium rounded-xl hover:bg-white transition-colors shadow-sm flex justify-center items-center gap-2"
                >
                  Ok <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center justify-between text-red-200 text-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 font-bold ml-4">
              &times;
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4 shadow-2xl">
              <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-neutral-200 font-medium text-sm">Analyzing image with Gemini...</span>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {currentView === 'home' && (
          <HomeView 
            inventory={inventory}
            isProcessing={isProcessing}
            onScanClick={() => fileInputRef.current?.click()}
            onManualAdd={handleManualAdd}
            onNavigateVerify={() => setCurrentView('verify')}
            onNavigate={(v) => setCurrentView(v)}
            lastUpdatedItem={lastUpdatedItem}
          />
        )}

        {currentView === 'verify' && (
          <VerifyItemsView 
            inventory={inventory}
            onManualAdd={handleManualAdd}
            onScanClick={() => fileInputRef.current?.click()}
            onEditProduct={handleEditProduct}
            onConsumeProduct={handleConsumeProduct}
          />
        )}

        {currentView === 'lists' && (
          <ListsView 
            inventory={inventory}
            shoppingLists={shoppingLists}
            onCreateList={handleCreateList}
            onAddListItem={handleAddListItem}
            onRemoveListItem={handleRemoveListItem}
            onToggleListItem={handleToggleListItem}
            onArchiveList={handleArchiveList}
          />
        )}

        {/* Existing Item Adjustment Prompt */}
        {showAdjustment && activeScan && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in duration-300">
              <div className="w-14 h-14 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-2 text-neutral-100">Update Quantity</h2>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                Found existing item:<br/>
                <span className="font-medium text-neutral-200">{inventory.find(p => p.barcodeId === activeScan.barcode)?.name}</span>
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleAdjustQuantity('IN', 1)}
                  className="p-5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl hover:bg-emerald-950/40 hover:border-emerald-900/50 transition-all group flex flex-col items-center"
                >
                  <div className="text-emerald-400 mb-1 font-medium text-xl group-hover:-translate-y-1 transition-transform">+1</div>
                  <div className="text-emerald-500/80 font-medium uppercase tracking-widest text-[10px]">Add</div>
                </button>
                <button 
                  onClick={() => handleAdjustQuantity('OUT', 1)}
                  className="p-5 bg-red-950/20 border border-red-900/30 rounded-xl hover:bg-red-950/40 hover:border-red-900/50 transition-all group flex flex-col items-center"
                >
                  <div className="text-red-400 mb-1 font-medium text-xl group-hover:translate-y-1 transition-transform">-1</div>
                  <div className="text-red-500/80 font-medium uppercase tracking-widest text-[10px]">Remove</div>
                </button>
              </div>
              
              <button 
                onClick={() => setShowAdjustment(false)}
                className="mt-6 text-neutral-500 hover:text-neutral-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* New Item Form Modal */}
        {showForm && activeScan && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-neutral-100">Register New Item</h2>
                  <p className="text-neutral-500 text-xs mt-1 font-mono">{activeScan.barcode}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Brand</label>
                  <input 
                    type="text" 
                    value={formData.brand} 
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="e.g. Generic"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Product Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Olive Oil"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Size / Volume</label>
                    <input 
                      type="text" 
                      value={formData.size} 
                      onChange={e => setFormData({...formData, size: e.target.value})}
                      placeholder="e.g. 500ml"
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Product Type</label>
                    <input 
                      type="text" 
                      value={formData.productType || ''} 
                      onChange={e => setFormData({...formData, productType: e.target.value})}
                      placeholder="e.g. Cereal"
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Category</label>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value as Category})}
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors appearance-none"
                    >
                      {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Initial Quantity</label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-neutral-800 text-neutral-400 text-sm font-medium rounded-lg hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNew}
                  className="px-4 py-2.5 bg-neutral-100 text-neutral-900 text-sm font-medium rounded-lg hover:bg-white transition-colors shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-neutral-600 text-[11px] tracking-wide">
        &copy; {new Date().getFullYear()} Cavtory Inventory System &bull; Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;