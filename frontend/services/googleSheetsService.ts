import { getAccessToken } from './googleAuth';
import { Product, ShoppingList } from '../types';

const DB_NAME = 'Cavtory Inventory Database';

export async function getOrCreateDatabase(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Search for the file in Drive
  const query = `name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: DB_NAME },
      sheets: [
        { properties: { title: 'Inventory' } },
        { properties: { title: 'Lists' } }
      ]
    })
  });

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;

  // Set up Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A1:G1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [['Barcode', 'Brand', 'Name', 'Size', 'Category', 'Quantity', 'LastUpdated']] })
  });
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Lists!A1:E1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [['ListId', 'Name', 'Status', 'CreatedAt', 'ItemsJSON']] })
  });

  return spreadsheetId;
}

export async function fetchInventory(spreadsheetId: string): Promise<Product[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A2:G`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  
  if (!data.values) return [];
  
  return data.values.map((row: any[]) => ({
    barcodeId: row[0] || '',
    brand: row[1] || '',
    name: row[2] || '',
    size: row[3] || '',
    category: row[4] as any,
    quantity: Number(row[5]) || 0,
    lastUpdated: row[6] || ''
  }));
}

export async function fetchLists(spreadsheetId: string): Promise<ShoppingList[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Lists!A2:E`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!data.values) return [];

  return data.values.map((row: any[]) => ({
    id: row[0] || '',
    name: row[1] || '',
    status: row[2] as any,
    createdAt: row[3] || '',
    items: row[4] ? JSON.parse(row[4]) : []
  }));
}

export async function saveInventory(spreadsheetId: string, inventory: Product[]) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Clear existing content except headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A2:G:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (inventory.length === 0) return;

  const values = inventory.map(item => [
    item.barcodeId,
    item.brand,
    item.name,
    item.size,
    item.category,
    item.quantity,
    item.lastUpdated
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A2:G?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
}

export async function saveLists(spreadsheetId: string, lists: ShoppingList[]) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Clear existing content except headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Lists!A2:E:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (lists.length === 0) return;

  const values = lists.map(list => [
    list.id,
    list.name,
    list.status,
    list.createdAt,
    JSON.stringify(list.items)
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Lists!A2:E?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
}
