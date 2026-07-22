import React, { useState } from 'react';
import { Category, Product } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { Search, Plus, Edit2, PackageMinus } from 'lucide-react';

interface VerifyItemsViewProps {
  inventory: Product[];
  onManualAdd: (name: string) => void;
  onScanClick: () => void;
  onEditProduct?: (barcodeId: string, updates: Partial<Product>) => Promise<void>;
  onConsumeProduct?: (barcodeId: string, quantity: number) => Promise<void>;
}

export const VerifyItemsView: React.FC<VerifyItemsViewProps> = ({ 
  inventory = [], 
  onManualAdd, 
  onScanClick, 
  onEditProduct, 
  onConsumeProduct 
}) => {
  const safeInventory = inventory || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [consumingProduct, setConsumingProduct] = useState<Product | null>(null);
  const [consumeQuantity, setConsumeQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      brand: product.brand,
      size: product.size,
      category: product.category,
      productType: product.productType
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !onEditProduct) return;
    setIsSaving(true);
    try {
      await onEditProduct(editingProduct.barcodeId, editFormData);
      setEditingProduct(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConsumeSubmit = async () => {
    if (!consumingProduct || !onConsumeProduct) return;
    setIsSaving(true);
    try {
      await onConsumeProduct(consumingProduct.barcodeId, consumeQuantity);
      setConsumingProduct(null);
      setConsumeQuantity(1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.barcodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-500" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
            placeholder="Search by name, brand or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => onManualAdd(searchTerm)}
          className="w-full md:w-auto px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white transition-colors"
        >
          <Plus size={18} />
          Create Item
        </button>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-neutral-900/50 text-neutral-500 text-[10px] uppercase font-medium tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-neutral-800">Product</th>
                <th className="px-6 py-4 font-medium border-b border-neutral-800">Barcode</th>
                <th className="px-6 py-4 font-medium border-b border-neutral-800">Category</th>
                <th className="px-6 py-4 font-medium border-b border-neutral-800">Qty</th>
                <th className="px-6 py-4 font-medium border-b border-neutral-800 text-right">Last Updated</th>
                <th className="px-6 py-4 font-medium border-b border-neutral-800 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-neutral-500 text-sm">
                    <div className="flex flex-col items-center">
                      <Search size={32} className="text-neutral-600 mb-4" />
                      <p className="mb-2">No products found matching "{searchTerm}"</p>
                      <button 
                        onClick={onScanClick}
                        className="text-neutral-300 underline underline-offset-4 hover:text-neutral-100 transition-colors"
                      >
                        Scan a barcode to add it
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).map(item => (
                  <tr key={item.barcodeId} className="hover:bg-neutral-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-200 text-sm">{item.name}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{item.brand} &bull; {item.size} {item.productType && `• ${item.productType}`}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-neutral-500">{item.barcodeId}</td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${item.quantity <= 2 ? 'text-red-400' : 'text-neutral-300'}`}>
                        {item.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-neutral-500 text-right opacity-80">
                      {item.lastUpdated}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {onConsumeProduct && item.quantity > 0 && (
                          <button 
                            onClick={() => {
                              setConsumingProduct(item);
                              setConsumeQuantity(1);
                            }}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 rounded transition-colors"
                            title="Consume/Extract Items"
                          >
                            <PackageMinus size={14} />
                          </button>
                        )}
                        {onEditProduct && (
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-neutral-100">Edit Product Details</h2>
                <p className="text-neutral-500 text-xs mt-1 font-mono">{editingProduct.barcodeId}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Brand</label>
                <input type="text" value={editFormData.brand || ''} onChange={e => setEditFormData({...editFormData, brand: e.target.value})} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Product Name</label>
                <input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Size / Volume</label>
                  <input type="text" value={editFormData.size || ''} onChange={e => setEditFormData({...editFormData, size: e.target.value})} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Product Type</label>
                  <input type="text" value={editFormData.productType || ''} onChange={e => setEditFormData({...editFormData, productType: e.target.value})} placeholder="e.g. Cereal" className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Category</label>
                <select value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value as Category})} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors appearance-none">
                  {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-800 grid grid-cols-2 gap-3">
              <button onClick={() => setEditingProduct(null)} className="px-4 py-2.5 border border-neutral-800 text-neutral-400 text-sm font-medium rounded-lg hover:text-neutral-200 hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2.5 bg-neutral-100 text-neutral-900 text-sm font-medium rounded-lg hover:bg-white transition-colors shadow-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Consume Product Modal */}
      {consumingProduct && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-neutral-100">Extract Items</h2>
                <p className="text-neutral-500 text-xs mt-1">{consumingProduct.name}</p>
              </div>
              <button onClick={() => setConsumingProduct(null)} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-neutral-400 uppercase mb-2">Quantity to Extract</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  min="1" 
                  max={consumingProduct.quantity}
                  value={consumeQuantity} 
                  onChange={e => setConsumeQuantity(parseInt(e.target.value) || 1)} 
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:border-neutral-600 focus:outline-none transition-colors" 
                />
                <span className="text-sm text-neutral-500 whitespace-nowrap">/ {consumingProduct.quantity} available</span>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-800 grid grid-cols-2 gap-3">
              <button onClick={() => setConsumingProduct(null)} className="px-4 py-2.5 border border-neutral-800 text-neutral-400 text-sm font-medium rounded-lg hover:text-neutral-200 hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={handleConsumeSubmit} disabled={isSaving || consumeQuantity < 1 || consumeQuantity > consumingProduct.quantity} className="px-4 py-2.5 bg-rose-600/90 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50">{isSaving ? 'Extracting...' : 'Confirm Extract'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
