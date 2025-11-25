# KDocs to Shopify Workflow

Simple workflow for updating Shopify inventory from KDocs spreadsheet data.

## 📋 Workflow

### Step 1: Export from KDocs

1. Open your KDocs document: https://www.kdocs.cn/l/cp5YRylYRBv6
2. Click **File** → **Download as** → **CSV**
3. Save to your project directory as `kdocs-export.csv`

### Step 2: Process and Update Shopify

Run the automated import:

```bash
./run-kdocs-to-shopify.sh
```

Or manually:

```bash
# Process the exported CSV and update Shopify inventory
node process-kdocs-data.js
```

## 🔄 What It Does

1. ✅ Reads your exported KDocs CSV
2. ✅ Extracts the specified columns (B10:I23 by default)
3. ✅ Maps data to Shopify inventory format
4. ✅ Updates inventory using barcodes
5. ✅ Generates summary report

## 📁 File Locations

- **Input**: `kdocs-export.csv` (downloaded from KDocs)
- **Output**:
  - `inventory-update-log.json` - Update history
  - `shopify-import.csv` - Processed data for Shopify

## ⚙️ Configuration

Edit `.env` to customize:

```bash
# KDocs data mapping
KDOCS_EXPORT_FILE=./kdocs-export.csv
KDOCS_START_ROW=10
KDOCS_END_ROW=23
KDOCS_BARCODE_COLUMN=B
KDOCS_QUANTITY_COLUMN=I

# Shopify update
SHOPIFY_AUTO_UPDATE=true
```

## 🔄 Automation (Optional)

To automatically process when you download a new CSV:

### macOS/Linux:
```bash
# Watch for new CSV files
./watch-kdocs-exports.sh
```

This will automatically detect new CSV files in the directory and process them.

## 📊 Column Mapping

Default mapping for B10:I23 range:

| Column | Content | Use |
|--------|---------|-----|
| B | Barcode | Product lookup |
| C | Product Name | Reference |
| D | SKU | Reference |
| E | Price | Update price (optional) |
| F | Stock | Current stock |
| G | Delta | Quantity to add |
| H | Notes | Ignored |
| I | Quantity | Final quantity |

You can customize the mapping in `process-kdocs-data.js`.

## 💡 Tips

1. **Export regularly** - Set a schedule to export from KDocs
2. **Backup** - Keep previous exports in an `exports/` folder
3. **Verify** - Check the log files after each update
4. **Test first** - Try with a small range before full import

## 🚀 Quick Start

1. Export your KDocs spreadsheet to CSV
2. Save as `kdocs-export.csv` in this directory
3. Run: `./run-kdocs-to-shopify.sh`
4. Check the log for results

That's it!

## 🔧 Advanced

### Custom Range
Edit `.env`:
```bash
KDOCS_START_ROW=5
KDOCS_END_ROW=50
```

### Different Columns
Edit the column mapping in `process-kdocs-data.js`:
```javascript
const barcodeCol = 'A';  // Change from B to A
const quantityCol = 'H'; // Change from I to H
```

### Schedule Auto-Export
Use KDocs sharing features to auto-export, or set up a cron job to remind you to export daily.

---

**No API needed!** Just export → process → done.
