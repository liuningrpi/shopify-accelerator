# SKU Generation Format - Updated

## 🔄 Changes Made

The SKU auto-generation logic has been updated to follow the new format.

## 📋 New SKU Format

```
VENDOR-TYPE-INITIALS-DATE
```

### Components Breakdown

1. **VENDOR** - Vendor name (cleaned, uppercase, alphanumeric only)
   - Example: "SHXM" → `SHXM`
   - Falls back to "UNKNOWN" if no vendor provided

2. **TYPE** - Product type (cleaned, uppercase, alphanumeric only)
   - Example: "Kitchenware" → `KITCHENWARE`
   - Defaults to "Kitchenware" if not in CSV

3. **INITIALS** - First letter of each word in the title
   - Splits on spaces, hyphens, commas, and periods
   - Takes first character of each word
   - Converts to uppercase
   - Example: "Jar - Panda Color-Stripe" → `JPCS`

4. **DATE** - Current date in YYYYMMDD format
   - Example: November 20, 2025 → `20251120`

## 📊 Examples from test.csv

| Product Title | Generated SKU |
|--------------|---------------|
| Jar - Panda Color-Stripe | `SHXM-KITCHENWARE-JPCS-20251120` |
| Jar - Panda Mermaid | `SHXM-KITCHENWARE-JPM-20251120` |
| Pink Orca Large Round Plate | `SHXM-KITCHENWARE-POLRP-20251120` |
| Panda Croissant Deep Plate | `SHXM-KITCHENWARE-PCDP-20251120` |
| Bunny Apple Plate | `SHXM-KITCHENWARE-BAP-20251120` |
| Pink Orca Square Plate | `SHXM-KITCHENWARE-POSP-20251120` |
| Pink Orca Mug with Handle | `SHXM-KITCHENWARE-POMWH-20251120` |
| Panda Layered Checkered Cup | `SHXM-KITCHENWARE-PLCC-20251120` |
| Panda Layered Striped Cup | `SHXM-KITCHENWARE-PLSC-20251120` |

## 🔍 Previous Format vs New Format

### Before
```
VENDOR_CODE-TITLE_CODE-SEQUENCE
Example: SHXM-JARPANDA-001
```

### After
```
VENDOR-TYPE-INITIALS-DATE
Example: SHXM-KITCHENWARE-JPCS-20251120
```

## ⚙️ Technical Details

### Code Location
- File: `add-inventory.js`
- Lines: 23-47

### Key Features
- Only generates SKU if not provided in CSV
- Cleans all components (removes special characters, spaces)
- Converts all text to uppercase for consistency
- Uses current date, so SKUs are unique per day

### Testing
Run the test script to see SKU generation examples:
```bash
node test-sku-generation.js
```

## 💡 Important Notes

1. **Date-based uniqueness**: SKUs include the current date, so products created on different days will have different SKUs even with identical titles
2. **CSV precedence**: If your CSV has a `SKU` column with values, those will be used instead of auto-generation
3. **Type column**: Make sure your CSV includes a `Type` column if you want specific product types. Otherwise defaults to "Kitchenware"
4. **Initials extraction**: The system intelligently splits titles on spaces, hyphens, commas, and periods to extract initials

## ✅ Testing Results

All 9 products in `test.csv` successfully generated SKUs with the new format. See test output above for details.
