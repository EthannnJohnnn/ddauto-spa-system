CREATE TABLE daily_close_runs (
  id INTEGER PRIMARY KEY,
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('CLOSED', 'REOPENED')),
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
  payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  payroll_centavos INTEGER NOT NULL DEFAULT 0 CHECK (payroll_centavos >= 0),
  meal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (meal_centavos >= 0),
  close_note TEXT NOT NULL DEFAULT '',
  reopen_reason TEXT,
  closed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reopened_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  closed_at TEXT NOT NULL,
  reopened_at TEXT
) STRICT;

CREATE UNIQUE INDEX daily_close_runs_one_closed_date_index
  ON daily_close_runs(business_date)
  WHERE status = 'CLOSED';

CREATE INDEX daily_close_runs_date_history_index
  ON daily_close_runs(business_date, id DESC);
