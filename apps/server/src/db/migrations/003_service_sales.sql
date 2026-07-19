ALTER TABLE services
ADD COLUMN labor_policy TEXT NOT NULL DEFAULT 'ORDINARY'
CHECK (labor_policy IN ('ORDINARY', 'SPECIALIST', 'EXTERNAL'));

ALTER TABLE services
ADD COLUMN labor_rate_basis_points INTEGER NOT NULL DEFAULT 4000
CHECK (labor_rate_basis_points BETWEEN 0 AND 10000);

UPDATE services
SET labor_policy = CASE
      WHEN name IN ('Graphene/Ceramic', 'Detailing') THEN 'SPECIALIST'
      WHEN name = 'Painting' THEN 'EXTERNAL'
      ELSE 'ORDINARY'
    END,
    labor_rate_basis_points = CASE
      WHEN name IN ('Graphene/Ceramic', 'Detailing') THEN 3000
      WHEN name = 'Painting' THEN 0
      ELSE 4000
    END;

CREATE TABLE service_tickets (
  id INTEGER PRIMARY KEY,
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  customer_sequence INTEGER NOT NULL CHECK (customer_sequence > 0),
  vehicle_class_id INTEGER NOT NULL REFERENCES vehicle_classes(id) ON DELETE RESTRICT,
  vehicle_class_name_snapshot TEXT NOT NULL,
  vehicle_description TEXT NOT NULL DEFAULT '',
  plate_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (business_date, customer_sequence)
) STRICT;

CREATE INDEX service_tickets_business_date_index
  ON service_tickets(business_date, status, customer_sequence);

CREATE TABLE service_ticket_items (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_name_snapshot TEXT NOT NULL,
  labor_policy_snapshot TEXT NOT NULL
    CHECK (labor_policy_snapshot IN ('ORDINARY', 'SPECIALIST', 'EXTERNAL')),
  labor_rate_basis_points_snapshot INTEGER NOT NULL
    CHECK (labor_rate_basis_points_snapshot BETWEEN 0 AND 10000),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  labor_pool_centavos INTEGER NOT NULL CHECK (labor_pool_centavos >= 0),
  external_contractor_name TEXT NOT NULL DEFAULT '',
  external_labor_cost_centavos INTEGER NOT NULL DEFAULT 0
    CHECK (external_labor_cost_centavos >= 0),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX service_ticket_items_ticket_id_index
  ON service_ticket_items(ticket_id, id);

CREATE TABLE service_ticket_item_workers (
  item_id INTEGER NOT NULL REFERENCES service_ticket_items(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_name_snapshot TEXT NOT NULL,
  labor_share_centavos INTEGER NOT NULL CHECK (labor_share_centavos >= 0),
  PRIMARY KEY (item_id, employee_id)
) STRICT;

CREATE INDEX service_ticket_item_workers_employee_index
  ON service_ticket_item_workers(employee_id, item_id);

CREATE TABLE daily_attendance (
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_name_snapshot TEXT NOT NULL,
  fixed_daily_rate_centavos_snapshot INTEGER NOT NULL CHECK (
    fixed_daily_rate_centavos_snapshot >= 0
  ),
  is_present INTEGER NOT NULL CHECK (is_present IN (0, 1)),
  meal_cost_centavos INTEGER NOT NULL DEFAULT 0 CHECK (meal_cost_centavos >= 0),
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (business_date, employee_id)
) STRICT;

CREATE INDEX daily_attendance_employee_date_index
  ON daily_attendance(employee_id, business_date);
