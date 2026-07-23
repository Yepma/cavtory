import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Camera, Search, ListPlus, X } from 'lucide-react';

interface HomeViewProps {
  inventory?: Product[];
  onScanClick: () => void;
  onManualAdd?: (initialName: string) => void;
  onNavigateVerify?: () => void;
  onNavigate?: (view: 'verify' | 'lists') => void;
  isProcessing?: boolean;
  lastUpdatedItem?: Product | null;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  inventory = [], 
  onScanClick, 
  onNavigateVerify,
  onNavigate,
  isProcessing = false 
}) => {
  const safeInventory = inventory || [];
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const categoryCounts = Object.values(Category).reduce((acc, cat) => {
    acc[cat] = safeInventory.filter(p => p.category === cat).reduce((sum, p) => sum + (p.quantity || 0), 0);
    return acc;
  }, {} as Record<Category, number>);

  const handleVerifyClick = () => {
    if (onNavigateVerify) onNavigateVerify();
    else if (onNavigate) onNavigate('verify');
  };

  const handleListsClick = () => {
    if (onNavigate) onNavigate('lists');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onScanClick}
          disabled={isProcessing}
          className="flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            {isProcessing ? (
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Camera size={32} />
            )}
          </div>
          <span className="text-neutral-100 font-medium text-lg">Scan Item</span>
          <span className="text-neutral-500 text-sm mt-1">Add via barcode image</span>
        </button>

        <button
          onClick={handleVerifyClick}
          className="flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-colors group"
        >
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search size={32} />
          </div>
          <span className="text-neutral-100 font-medium text-lg">Verify Items</span>
          <span className="text-neutral-500 text-sm mt-1">Search & manage inventory</span>
        </button>

        <button
          onClick={handleListsClick}
          className="flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-colors group"
        >
          <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ListPlus size={32} />
          </div>
          <span className="text-neutral-100 font-medium text-lg">Create List</span>
          <span className="text-neutral-500 text-sm mt-1">Manage shopping lists</span>
        </button>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <h2 className="text-lg font-medium text-neutral-100 mb-6">Inventory Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat as Category)}
              className={`p-4 rounded-xl border text-left transition-colors ${selectedCategory === cat ? 'bg-neutral-800 border-neutral-600' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'}`}
            >
              <div className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">{cat}</div>
              <div className="text-3xl font-semibold text-neutral-100">{count}</div>
              <div className="text-neutral-500 text-xs mt-1">Total items</div>
            </button>
          ))}
        </div>
        
        {selectedCategory && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-4 border-t border-neutral-800 pt-6">
              <h3 className="text-md font-medium text-neutral-200">
                {selectedCategory} Breakdown
              </h3>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-md hover:bg-neutral-800 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <X size={16} /> Close
              </button>
            </div>
            
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium border-b border-neutral-800">Product Type</th>
                    <th className="px-6 py-3 font-medium border-b border-neutral-800 text-right">Total Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {Object.entries(
                    safeInventory
                      .filter(p => p.category === selectedCategory)
                      .reduce((acc, p) => {
                        const pt = p.productType || 'Uncategorized';
                        acc[pt] = (acc[pt] || 0) + (p.quantity || 0);
                        return acc;
                      }, {} as Record<string, number>)
                  )
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .map(([type, qty]) => (
                    <tr key={type} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-neutral-300">{type}</td>
                      <td className="px-6 py-3 text-sm text-neutral-300 text-right font-medium">{qty}</td>
                    </tr>
                  ))}
                  {safeInventory.filter(p => p.category === selectedCategory).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-neutral-500 text-sm">
                        No items found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
