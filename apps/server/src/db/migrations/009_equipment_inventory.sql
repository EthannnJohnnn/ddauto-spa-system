CREATE TABLE equipment_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

INSERT INTO equipment_categories (name, created_at, updated_at)
VALUES
  ('Towels', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Hoses', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Machines', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Cleaning Tools', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Other', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE equipment_purchase_batches (
  id INTEGER PRIMARY KEY,
  business_date TEXT NOT NULL CHECK (length(business_date) = 10 AND business_date GLOB '????-??-??'),
  category_id INTEGER NOT NULL REFERENCES equipment_categories(id) ON DELETE RESTRICT,
  category_name_snapshot TEXT NOT NULL,
  item_name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 500),
  unit_cost_centavos INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_centavos >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  reference_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE equipment_items (
  id INTEGER PRIMARY KEY,
  purchase_batch_id INTEGER NOT NULL REFERENCES equipment_purchase_batches(id) ON DELETE RESTRICT,
  category_id INTEGER NOT NULL REFERENCES equipment_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  asset_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL CHECK (condition IN ('GOOD', 'NEEDS_ATTENTION', 'UNDER_REPAIR', 'DAMAGED')),
  condition_checked_on TEXT NOT NULL CHECK (length(condition_checked_on) = 10 AND condition_checked_on GLOB '????-??-??'),
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX equipment_items_filter_index
  ON equipment_items(is_active, condition, category_id, name, id);

CREATE TABLE equipment_repairs (
  id INTEGER PRIMARY KEY,
  equipment_item_id INTEGER NOT NULL REFERENCES equipment_items(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL CHECK (length(business_date) = 10 AND business_date GLOB '????-??-??'),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  description TEXT NOT NULL,
  payee TEXT NOT NULL DEFAULT '',
  reference_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  resulting_condition TEXT NOT NULL CHECK (resulting_condition IN ('GOOD', 'NEEDS_ATTENTION', 'UNDER_REPAIR', 'DAMAGED')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE equipment_expense_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  purchase_category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  repair_category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT
) STRICT;

INSERT INTO equipment_expense_settings (id, purchase_category_id, repair_category_id)
SELECT 1,
  (SELECT id FROM expense_categories WHERE name = 'Supplies' COLLATE NOCASE LIMIT 1),
  (SELECT id FROM expense_categories WHERE name = 'Repairs' COLLATE NOCASE LIMIT 1);

CREATE TABLE expense_transactions_new (
  id INTEGER PRIMARY KEY,
  business_date TEXT NOT NULL CHECK (length(business_date) = 10 AND business_date GLOB '????-??-??'),
  category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  category_name_snapshot TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  payee TEXT NOT NULL DEFAULT '',
  reference_number TEXT NOT NULL DEFAULT '',
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  notes TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source_type IN ('MANUAL', 'PAYROLL', 'STAFF_MEAL', 'EQUIPMENT_PURCHASE', 'EQUIPMENT_REPAIR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  equipment_purchase_batch_id INTEGER REFERENCES equipment_purchase_batches(id) ON DELETE RESTRICT,
  equipment_repair_id INTEGER REFERENCES equipment_repairs(id) ON DELETE RESTRICT
) STRICT;

INSERT INTO expense_transactions_new (
  id, business_date, category_id, category_name_snapshot, description, payee,
  reference_number, amount_centavos, notes, source_type, status, void_reason,
  created_by_user_id, updated_by_user_id, created_at, updated_at, payroll_run_id
)
SELECT id, business_date, category_id, category_name_snapshot, description, payee,
  reference_number, amount_centavos, notes, source_type, status, void_reason,
  created_by_user_id, updated_by_user_id, created_at, updated_at, payroll_run_id
FROM expense_transactions;

DROP TABLE expense_transactions;
ALTER TABLE expense_transactions_new RENAME TO expense_transactions;

CREATE INDEX expense_transactions_period_index
  ON expense_transactions(business_date, status, category_id, id);
CREATE UNIQUE INDEX expense_transactions_payroll_source_index
  ON expense_transactions(payroll_run_id, source_type)
  WHERE payroll_run_id IS NOT NULL;
CREATE UNIQUE INDEX expense_transactions_equipment_purchase_index
  ON expense_transactions(equipment_purchase_batch_id)
  WHERE equipment_purchase_batch_id IS NOT NULL;
CREATE UNIQUE INDEX expense_transactions_equipment_repair_index
  ON expense_transactions(equipment_repair_id)
  WHERE equipment_repair_id IS NOT NULL;
