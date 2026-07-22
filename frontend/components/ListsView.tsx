import React, { useState, useEffect } from 'react';
import { Product, ShoppingList, ShoppingListItem } from '../types';
import { Plus, Archive, ChevronLeft, Search, X } from 'lucide-react';

interface ListsViewProps {
  inventory: Product[];
  shoppingLists: ShoppingList[];
  onCreateList: (name: string) => void;
  onAddListItem: (listId: string, barcodeId: string, quantity: number) => void;
  onRemoveListItem: (listId: string, itemId: string, barcodeId: string) => void;
  onToggleListItem: (listId: string, itemId: string) => void;
  onArchiveList: (listId: string) => void;
}

export const ListsView: React.FC<ListsViewProps> = ({ 
  inventory = [], 
  shoppingLists = [], 
  onCreateList, 
  onAddListItem,
  onRemoveListItem,
  onToggleListItem,
  onArchiveList
}) => {
  const safeInventory = inventory || [];
  const safeLists = shoppingLists || [];

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingItems, setIsAddingItems] = useState<boolean>(false);

  const activeList = shoppingLists.find(l => l.id === activeListId);

  useEffect(() => {
    if (activeList) {
      setIsAddingItems(activeList.items.length === 0);
    }
  }, [activeList?.id]);

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim());
      setNewListName('');
    }
  };

  const handleUpdateQuantity = (barcodeId: string, quantity: number) => {
    if (!activeList) return;
    
    const existingItem = activeList.items.find(i => i.barcodeId === barcodeId);
    
    if (quantity <= 0) {
      if (existingItem?.id) {
        onRemoveListItem(activeList.id, existingItem.id, barcodeId);
      }
    } else {
      onAddListItem(activeList.id, barcodeId, quantity);
    }
  };

  const getItemQuantity = (barcodeId: string) => {
    return activeList?.items.find(i => i.barcodeId === barcodeId)?.quantity || 0;
  };

  // List detail view
  if (activeList) {
    const filteredInventory = inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.barcodeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedInventory = filteredInventory.reduce((acc, item) => {
      const cat = item.category || 'Other';
      const type = item.productType || 'Other';
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][type]) acc[cat][type] = [];
      acc[cat][type].push(item);
      return acc;
    }, {} as Record<string, Record<string, Product[]>>);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveListId(null)}
              className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-100"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-medium text-neutral-100">{activeList.name}</h2>
          </div>
          <button
            onClick={() => {
              onArchiveList(activeList.id);
              setActiveListId(null);
            }}
            className="px-4 py-2 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-900/50 transition-colors flex-col"
          >
            <div className="flex items-center gap-2">
              <Archive size={16} />
              <span>Finalize Checked Items & Archive</span>
            </div>
          </button>
        </div>

        <div className={`grid grid-cols-1 ${isAddingItems ? 'md:grid-cols-2 gap-6' : 'max-w-3xl mx-auto gap-6'}`}>
          {isAddingItems && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-neutral-100">Add Items to List</h3>
                <button 
                  onClick={() => setIsAddingItems(false)} 
                  className="text-neutral-500 hover:text-white text-xs flex items-center gap-1 transition-colors bg-neutral-950 px-2 py-1 rounded"
                >
                  <X size={14} /> Close Catalog
                </button>
              </div>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-neutral-500" />
              </div>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-sm focus:outline-none focus:border-neutral-600"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {Object.keys(groupedInventory).length === 0 ? (
                <div className="text-center py-8 text-sm text-neutral-500">
                  No items found.
                </div>
              ) : (
                Object.entries(groupedInventory).sort().map(([category, types]) => (
                  <div key={category} className="mb-4">
                    <div className="sticky top-0 bg-neutral-900 z-10 py-1 border-b border-neutral-800 mb-2">
                      <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">{category}</h4>
                    </div>
                    {Object.entries(types).sort().map(([type, items]) => (
                      <div key={type} className="ml-2 mb-3 border-l-2 border-neutral-800 pl-3">
                        <h5 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">{type}</h5>
                        <div className="space-y-2">
                          {items.map(item => {
                            const qty = getItemQuantity(item.barcodeId);
                            return (
                              <div key={item.barcodeId} className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 rounded-lg">
                                <div>
                                  <div className="text-sm font-medium text-neutral-200">{item.name}</div>
                                  <div className="text-xs text-neutral-500">Stock: {item.quantity} &bull; {item.brand}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.barcodeId, Math.max(0, qty - 1))}
                                    className="w-8 h-8 flex items-center justify-center bg-neutral-900 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                                  >-</button>
                                  <span className="text-sm font-medium w-4 text-center">{qty}</span>
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.barcodeId, qty + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-neutral-900 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                                  >+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
          )}

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-neutral-100">Selected Items ({activeList.items.length})</h3>
              {!isAddingItems && (
                <button 
                  onClick={() => setIsAddingItems(true)} 
                  className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-sm text-neutral-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Add Items
                </button>
              )}
            </div>
            {activeList.items.length === 0 ? (
              <div className="text-center py-12 text-sm text-neutral-500">
                No items added to this list yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeList.items.map(listItem => {
                  const item = inventory.find(i => i.barcodeId === listItem.barcodeId);
                  if (!item) return null;
                  
                  return (
                    <div key={listItem.barcodeId} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${listItem.bought ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-neutral-950 border-neutral-800'}`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => listItem.id && onToggleListItem(activeList.id, listItem.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${listItem.bought ? 'bg-emerald-500 border-emerald-500 text-neutral-950' : 'bg-neutral-900 border-neutral-700 text-transparent hover:border-neutral-500'}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <div>
                          <div className={`text-sm font-medium transition-colors ${listItem.bought ? 'text-emerald-400 line-through opacity-70' : 'text-neutral-200'}`}>{item.name}</div>
                          <div className="text-xs text-neutral-500">{item.brand} {item.productType && `• ${item.productType}`}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500 text-xs uppercase tracking-wider font-medium">Qty</span>
                        <input
                          type="number"
                          min="0"
                          value={listItem.quantity}
                          onChange={(e) => handleUpdateQuantity(item.barcodeId, parseInt(e.target.value) || 0)}
                          className="w-16 bg-neutral-900 border border-neutral-800 rounded p-1 text-center text-sm text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // All Lists view
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
            placeholder="New List Name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
          />
        </div>
        <button
          onClick={handleCreateList}
          disabled={!newListName.trim()}
          className="w-full md:w-auto px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Create List
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shoppingLists.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-500">
            No shopping lists yet. Create one to start adding items!
          </div>
        ) : (
          shoppingLists.map(list => (
            <div 
              key={list.id} 
              className={`p-6 rounded-xl border transition-colors ${
                list.status === 'archived' 
                  ? 'bg-neutral-950/50 border-neutral-800/50 opacity-60' 
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 cursor-pointer'
              }`}
              onClick={() => list.status === 'active' && setActiveListId(list.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium text-neutral-100 text-lg">{list.name}</h3>
                {list.status === 'archived' && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-neutral-800 text-neutral-500">Archived</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm text-neutral-500">
                <span>{list.items.length} items</span>
                <span className="text-xs">{new Date(list.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
