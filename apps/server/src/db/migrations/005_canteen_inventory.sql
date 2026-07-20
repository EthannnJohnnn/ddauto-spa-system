CREATE TABLE canteen_products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('DRINK', 'SNACK', 'OTHER')),
  current_cost_centavos INTEGER NOT NULL DEFAULT 0 CHECK (current_cost_centavos >= 0),
  selling_price_centavos INTEGER NOT NULL DEFAULT 0 CHECK (selling_price_centavos >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX canteen_products_active_category_index
  ON canteen_products(is_active, category, name);

CREATE TABLE canteen_inventory_documents (
  id INTEGER PRIMARY KEY,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('BEGINNING', 'PURCHASE', 'SALE', 'ADJUSTMENT')),
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  document_sequence INTEGER NOT NULL CHECK (document_sequence > 0),
  counterparty_name TEXT NOT NULL DEFAULT '',
  reference_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (business_date, document_type, document_sequence)
) STRICT;

CREATE INDEX canteen_inventory_documents_period_index
  ON canteen_inventory_documents(business_date, document_type, status, document_sequence);

CREATE TABLE canteen_inventory_document_items (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES canteen_inventory_documents(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES canteen_products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL
    CHECK (category_snapshot IN ('DRINK', 'SNACK', 'OTHER')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_delta INTEGER NOT NULL CHECK (stock_delta <> 0),
  unit_cost_centavos_snapshot INTEGER NOT NULL DEFAULT 0
    CHECK (unit_cost_centavos_snapshot >= 0),
  unit_price_centavos_snapshot INTEGER NOT NULL DEFAULT 0
    CHECK (unit_price_centavos_snapshot >= 0),
  line_total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (line_total_centavos >= 0),
  created_at TEXT NOT NULL,
  UNIQUE (document_id, product_id)
) STRICT;

CREATE INDEX canteen_inventory_items_product_index
  ON canteen_inventory_document_items(product_id, document_id);
