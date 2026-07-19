CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  fixed_daily_rate_centavos INTEGER NOT NULL DEFAULT 0 CHECK (fixed_daily_rate_centavos >= 0),
  receives_labor_share INTEGER NOT NULL DEFAULT 1 CHECK (receives_labor_share IN (0, 1)),
  is_specialist INTEGER NOT NULL DEFAULT 0 CHECK (is_specialist IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX employees_one_active_specialist_index
  ON employees(is_specialist)
  WHERE is_specialist = 1 AND is_active = 1;

CREATE TABLE vehicle_classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  labor_rule TEXT NOT NULL CHECK (labor_rule IN ('ORDINARY', 'SPECIALIST')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE service_prices (
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  vehicle_class_id INTEGER NOT NULL REFERENCES vehicle_classes(id) ON DELETE RESTRICT,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (service_id, vehicle_class_id)
) STRICT;

INSERT INTO services (name, labor_rule, sort_order, created_at, updated_at)
VALUES
  ('Carwash', 'ORDINARY', 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Graphene/Ceramic', 'SPECIALIST', 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Painting', 'ORDINARY', 30, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Detailing', 'SPECIALIST', 40, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('Vulcanizing/Tire Change', 'ORDINARY', 50, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
