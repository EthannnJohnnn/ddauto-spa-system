ALTER TABLE daily_attendance
ADD COLUMN salary_override_centavos INTEGER CHECK (
  salary_override_centavos IS NULL OR salary_override_centavos >= 0
);

ALTER TABLE daily_attendance
ADD COLUMN salary_override_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE daily_attendance
ADD COLUMN salary_override_at TEXT;

CREATE TABLE attendance_day_reviews (
  business_date TEXT PRIMARY KEY CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  reviewed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at TEXT NOT NULL
) STRICT;

CREATE TABLE period_close_runs (
  id INTEGER PRIMARY KEY,
  start_date TEXT NOT NULL CHECK (length(start_date) = 10 AND start_date GLOB '????-??-??'),
  end_date TEXT NOT NULL CHECK (length(end_date) = 10 AND end_date GLOB '????-??-??'),
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('CLOSED', 'REOPENED')),
  total_sales_centavos INTEGER NOT NULL CHECK (total_sales_centavos >= 0),
  total_purchase_centavos INTEGER NOT NULL CHECK (total_purchase_centavos >= 0),
  total_expense_centavos INTEGER NOT NULL CHECK (total_expense_centavos >= 0),
  total_salary_centavos INTEGER NOT NULL CHECK (total_salary_centavos >= 0),
  total_meal_centavos INTEGER NOT NULL CHECK (total_meal_centavos >= 0),
  estimated_net_centavos INTEGER NOT NULL,
  close_note TEXT NOT NULL DEFAULT '',
  reopen_reason TEXT,
  closed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reopened_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  closed_at TEXT NOT NULL,
  reopened_at TEXT,
  CHECK (start_date <= end_date)
) STRICT;

CREATE INDEX period_close_runs_history_index
  ON period_close_runs(start_date DESC, end_date DESC, id DESC);

CREATE TABLE period_close_days (
  id INTEGER PRIMARY KEY,
  period_close_run_id INTEGER NOT NULL REFERENCES period_close_runs(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  service_sales_centavos INTEGER NOT NULL CHECK (service_sales_centavos >= 0),
  tire_sales_centavos INTEGER NOT NULL CHECK (tire_sales_centavos >= 0),
  canteen_sales_centavos INTEGER NOT NULL CHECK (canteen_sales_centavos >= 0),
  total_sales_centavos INTEGER NOT NULL CHECK (total_sales_centavos >= 0),
  product_cost_centavos INTEGER NOT NULL CHECK (product_cost_centavos >= 0),
  external_labor_centavos INTEGER NOT NULL CHECK (external_labor_centavos >= 0),
  expense_centavos INTEGER NOT NULL CHECK (expense_centavos >= 0),
  purchase_centavos INTEGER NOT NULL CHECK (purchase_centavos >= 0),
  estimated_gross_profit_centavos INTEGER NOT NULL,
  estimated_net_centavos INTEGER NOT NULL,
  cash_movement_centavos INTEGER NOT NULL,
  service_transaction_count INTEGER NOT NULL CHECK (service_transaction_count >= 0),
  tire_transaction_count INTEGER NOT NULL CHECK (tire_transaction_count >= 0),
  canteen_transaction_count INTEGER NOT NULL CHECK (canteen_transaction_count >= 0),
  present_employee_count INTEGER NOT NULL CHECK (present_employee_count >= 0),
  salary_centavos INTEGER NOT NULL CHECK (salary_centavos >= 0),
  meal_centavos INTEGER NOT NULL CHECK (meal_centavos >= 0),
  had_activity INTEGER NOT NULL CHECK (had_activity IN (0, 1)),
  UNIQUE (period_close_run_id, business_date)
) STRICT;

CREATE INDEX period_close_days_date_index
  ON period_close_days(business_date, period_close_run_id DESC);

CREATE TABLE period_close_employee_days (
  id INTEGER PRIMARY KEY,
  period_close_run_id INTEGER NOT NULL REFERENCES period_close_runs(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_name_snapshot TEXT NOT NULL,
  is_present INTEGER NOT NULL CHECK (is_present IN (0, 1)),
  fixed_daily_rate_centavos_snapshot INTEGER NOT NULL CHECK (
    fixed_daily_rate_centavos_snapshot >= 0
  ),
  labor_earned_centavos INTEGER NOT NULL CHECK (labor_earned_centavos >= 0),
  fixed_top_up_centavos INTEGER NOT NULL CHECK (fixed_top_up_centavos >= 0),
  calculated_salary_centavos INTEGER NOT NULL CHECK (calculated_salary_centavos >= 0),
  salary_override_centavos INTEGER CHECK (
    salary_override_centavos IS NULL OR salary_override_centavos >= 0
  ),
  final_salary_centavos INTEGER NOT NULL CHECK (final_salary_centavos >= 0),
  meal_cost_centavos INTEGER NOT NULL CHECK (meal_cost_centavos >= 0),
  UNIQUE (period_close_run_id, business_date, employee_id)
) STRICT;

CREATE INDEX period_close_employee_days_employee_index
  ON period_close_employee_days(employee_id, business_date, period_close_run_id DESC);

ALTER TABLE expense_transactions
ADD COLUMN period_close_run_id INTEGER REFERENCES period_close_runs(id) ON DELETE RESTRICT;

ALTER TABLE expense_transactions
ADD COLUMN period_close_business_date TEXT;

CREATE UNIQUE INDEX expense_transactions_period_close_source_index
  ON expense_transactions(period_close_run_id, period_close_business_date, source_type)
  WHERE period_close_run_id IS NOT NULL;
