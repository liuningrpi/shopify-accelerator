# 📦 两轮库存处理 - 完整流程

## 🎯 目标

确保**所有变体**（新的和旧的）都能正确更新库存数量，即使旧变体在第一轮被跳过。

## 🔄 完整的两轮流程

### 第一轮：创建产品和变体
**脚本**: `node add-inventory.js`

**处理逻辑**：

```
读取 ShopifyReady.csv
  ↓
按产品名称分组
  ↓
对每个产品：
  ├─ 检查产品是否已存在
  │
  ├─ 如果存在：
  │  ├─ 只添加新变体 (IfNew='Y') ✅
  │  ├─ 库存设为 0
  │  └─ 跳过旧变体 (IfNew='N') ⏭️
  │
  └─ 如果不存在：
     └─ 创建新产品（包含所有变体） ✅
        └─ 库存设为 0
```

**输出文件**：
1. `successful-products.json` - 新创建的产品/变体信息
2. `failed-products.json` - 失败的项目
3. **`delta.csv`** ⭐ - **包含所有变体**（新的和旧的）供第二轮使用

### 第二轮：更新库存数量
**脚本**: `node update-inventory-by-barcode.js delta.csv`

**处理逻辑**：

```
读取 delta.csv
  ↓
对每个条形码：
  ├─ 在 Shopify 中查找变体
  │
  ├─ 如果找到：
  │  └─ 更新库存数量 ✅
  │     (当前数量 + CSV中的数量)
  │
  └─ 如果未找到：
     └─ 记录到 barcodes-not-found.json ⚠️
```

## 📊 delta.csv 格式

**新增功能**：delta.csv 现在**自动包含所有变体**（新的和旧的）

```csv
Barcode,Variant Inventory,Title,SKU,Status
CB001,10,"Steel Pot - Red",SHXM-KW-SP-20241205-RED,New
CB002,15,"Steel Pot - Blue",SHXM-KW-SP-20241205-BLUE,Existing
CB003,8,"Steel Pot - Green",SHXM-KW-SP-20241205-GREEN,New
```

**列说明**：
- `Barcode`: 条形码（用于查找变体）
- `Variant Inventory`: 要添加的库存数量
- `Title`: 产品标题（参考信息）
- `SKU`: SKU（参考信息）
- `Status`:
  - `New` - 在第一轮新创建的变体
  - `Existing` - 已存在的旧变体（被跳过但仍需更新库存）

## 🔑 关键改进

### 1. 旧变体也包含在 delta.csv 中

**之前**：
- 旧变体被跳过
- delta.csv 只包含新变体
- 旧变体的库存不会被更新 ❌

**现在**：
- 旧变体在第一轮被跳过（不重复创建）
- 但它们被包含在 delta.csv 中
- 第二轮会更新它们的库存 ✅

### 2. 清晰的状态标记

每个变体都标记为 `New` 或 `Existing`，方便追踪。

### 3. 自动生成 delta.csv

第一轮完成后，自动创建 delta.csv，无需手动操作。

## 📝 完整示例

### 输入：ShopifyReady.csv

```csv
Barcode,Name,Option1 Name,Option1 Value,Variant Inventory,SalePrice,Photo,IfNew,Vendor
CB001,Steel Pot,Color,Red,10,29.99,pot-red.jpg,Y,SHXM
CB002,Steel Pot,Color,Blue,15,29.99,pot-blue.jpg,N,SHXM
CB003,Steel Pot,Color,Green,8,29.99,pot-green.jpg,Y,SHXM
```

### 第一轮：add-inventory.js

**处理**：
```
📦 Processing: Steel Pot (3 variants)
   Option: Color with values: Red, Blue, Green
   📊 Breakdown: 2 new variant(s), 1 old variant(s)
   ✓ Product already exists in Shopify (ID: gid://shopify/Product/123)
   → Adding 2 new variant(s) to existing product...
   ✅ Added new variant: Red (SKU: SHXM-KW-SP-20241205-RED)
   ✅ Added new variant: Green (SKU: SHXM-KW-SP-20241205-GREEN)
   ⏭️  Skipped existing variant: Blue
```

**输出：delta.csv**（自动创建）
```csv
Barcode,Variant Inventory,Title,SKU,Status
CB001,10,"Steel Pot",SHXM-KW-SP-20241205-RED,New
CB002,15,"Steel Pot",SHXM-KW-SP-20241205-BLUE,Existing
CB003,8,"Steel Pot",SHXM-KW-SP-20241205-GREEN,New
```

**注意**：Blue 虽然被跳过（没有重复创建），但仍然在 delta.csv 中！

### 第二轮：update-inventory-by-barcode.js delta.csv

**处理**：
```
🔍 CB001 → Add 10 units
   ✅ Steel Pot - Red
      SKU: SHXM-KW-SP-20241205-RED | Current: 0 + 10 = 10
      ✅ Added 10 units (new total: 10)

🔍 CB002 → Add 15 units
   ✅ Steel Pot - Blue
      SKU: SHXM-KW-SP-20241205-BLUE | Current: 5 + 15 = 20
      ✅ Added 15 units (new total: 20)  ← 旧变体库存也更新了！

🔍 CB003 → Add 8 units
   ✅ Steel Pot - Green
      SKU: SHXM-KW-SP-20241205-GREEN | Current: 0 + 8 = 8
      ✅ Added 8 units (new total: 8)
```

**结果**：
- Red (新) → 库存设为 10 ✅
- Blue (旧) → 库存更新为 20 ✅
- Green (新) → 库存设为 8 ✅

## 🚀 使用步骤

### 步骤 1：准备 CSV 文件

确保 `ShopifyReady.csv` 包含：
- 所有变体（新的和旧的）
- 正确的 `IfNew` 标记（Y 或 N）
- 每个变体的条形码
- 库存数量

### 步骤 2：运行第一轮

```bash
node add-inventory.js
```

**输出**：
- 创建新产品/变体
- 跳过旧变体
- 自动生成 `delta.csv`

### 步骤 3：运行第二轮

```bash
node update-inventory-by-barcode.js delta.csv
```

**结果**：
- 更新所有变体的库存（包括旧变体）

### 步骤 4：验证

检查 Shopify 后台：
- 新变体应该出现
- 所有变体的库存数量应该正确

## 📊 统计输出

### 第一轮完成

```
============================================================
🎉 Process completed!
============================================================
✅ Successfully processed: 2 variant(s)     (新创建的)
⏭️  Skipped (already exist): 1 variant(s)  (旧变体)
❌ Failed to process: 0 variant(s)

📝 Creating delta.csv for inventory update (second pass)...
✅ Created delta.csv with 3 variants for inventory sync
   - New variants: 2
   - Existing variants: 1

💡 Next step: Run inventory sync with:
   node update-inventory-by-barcode.js delta.csv
```

### 第二轮完成

```
============================================================
📊 Update Summary
============================================================
✅ Updated: 3 products
❌ Not found: 0 barcodes
⚠️  Errors: 0

📦 Total units added: 33
```

## ⚠️ 注意事项

### 1. 条形码必须唯一

每个变体必须有唯一的条形码，否则第二轮无法正确匹配。

### 2. IfNew 标记必须准确

- `Y` = 新变体，会在第一轮创建
- `N` = 旧变体，会在第一轮跳过
- **两种情况下都会在第二轮更新库存**

### 3. delta.csv 会被覆盖

每次运行第一轮，`delta.csv` 都会被重新创建。

### 4. 库存是累加的

第二轮会**添加**库存，不是替换。例如：
- 当前库存：5
- CSV 中的数量：10
- 更新后：15（5 + 10）

## 🔧 故障排除

### 问题：旧变体库存没有更新

**检查**：
1. 第一轮是否生成了 delta.csv？
2. delta.csv 中是否包含旧变体？
3. 旧变体的条形码是否正确？
4. 第二轮是否成功找到变体？

**解决**：
```bash
# 检查 delta.csv
cat delta.csv

# 检查是否包含旧变体
grep "Existing" delta.csv
```

### 问题：delta.csv 中缺少某些变体

**原因**：变体没有条形码

**解决**：在 ShopifyReady.csv 中为每个变体添加条形码

### 问题：库存数量不正确

**原因**：第二轮是累加而不是替换

**解决**：如果需要设置绝对值而不是累加，需要修改 `update-inventory-by-barcode.js`

## ✅ 总结

**关键改进**：
- ✅ 旧变体不会重复创建
- ✅ 旧变体的库存会在第二轮更新
- ✅ delta.csv 自动包含所有变体
- ✅ 清晰的状态追踪（New/Existing）

**工作流程**：
1. 第一轮：创建新产品/变体，跳过旧变体，生成 delta.csv
2. 第二轮：使用 delta.csv 更新所有变体的库存

**最终结果**：
- 没有重复产品 ✅
- 所有变体库存正确 ✅
- 清晰的处理日志 ✅
