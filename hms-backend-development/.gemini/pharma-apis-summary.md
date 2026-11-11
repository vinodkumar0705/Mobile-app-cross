# Pharma Controller APIs

## Summary
Added 5 new API endpoints to the pharma controller for managing medical items, batches, and stock movements.

---

## API Endpoints

### 1. **Fetch Medical Items**
- **Method:** GET
- **Route:** `/api/v1/pharma/getMedicalItems`
- **Description:** Fetches all active medical items with their batches (ordered by expiry date)
- **Response:** List of medical items with total stock and batch details

---

### 2. **Fetch Medical Item by ID**
- **Method:** GET
- **Route:** `/api/v1/pharma/getMedicalItemById/:id`
- **Description:** Fetches a single medical item by ID with all its batches
- **Response:** Medical item details with batches

---

### 3. **Fetch Stock Movements**
- **Method:** GET
- **Route:** `/api/v1/pharma/getStockMovements`
- **Description:** Fetches all stock movements with batch and item details (ordered by most recent)
- **Response:** List of stock movements with complete batch and item information

---

### 4. **Fetch Batches (Expiry Order)**
- **Method:** GET
- **Route:** `/api/v1/pharma/getBatches`
- **Description:** Fetches all active batches ordered by expiry date (ascending)
- **Response:** List of batches with item details, sorted by expiry date

---

### 5. **Add Medical Item**
- **Method:** POST
- **Route:** `/api/v1/pharma/addMedicalItem`
- **Description:** Creates a new medical item
- **Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "itemType": "MEDICINE | MEDICAL_SUPPLY | etc. (required)",
  "unit": "string (required)",
  "strength": "string (e.g., '500mg')",
  "dosageForm": "string (e.g., 'Tablet')",
  "genericName": "string",
  "brand": "string",
  "reorderLevel": "number (default: 10)",
  "maxStock": "number",
  "hasExpiry": "boolean (default: true)",
  "requiresColdChain": "boolean (default: false)",
  "isControlled": "boolean (default: false)"
}
```
- **Response:** Created medical item

---

### 6. **Add Batch**
- **Method:** POST
- **Route:** `/api/v1/pharma/addBatch`
- **Description:** Creates a new batch and automatically creates a stock movement entry
- **Request Body:**
```json
{
  "itemId": "string (required)",
  "batchNumber": "string (required)",
  "mfgDate": "string (ISO date format)",
  "expiryDate": "string (ISO date format)",
  "quantity": "number (required)",
  "unitPrice": "number",
  "costPrice": "number",
  "mrp": "number",
  "supplier": "string",
  "supplierBatch": "string"
}
```
- **Response:** Created batch
- **Note:** Automatically creates a stock movement with type "ADD" for the quantity

---

## Features
- Simple and clean implementations
- Proper error handling
- Automatic stock movement tracking when adding batches
- Batches ordered by expiry date
- Only active items/batches are shown
- Full item details included in batch responses
