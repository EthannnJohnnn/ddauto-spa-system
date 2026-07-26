ALTER TABLE expense_categories
ADD COLUMN system_code TEXT CHECK (system_code IN ('PAYROLL', 'STAFF_MEAL'));

UPDATE expense_categories SET system_code = 'PAYROLL' WHERE name = 'Salaries' COLLATE NOCASE;
UPDATE expense_categories SET system_code = 'STAFF_MEAL' WHERE name = 'Staff Meals' COLLATE NOCASE;

INSERT INTO expense_categories (name, system_code, created_at, updated_at)
SELECT 'Salaries', 'PAYROLL', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE system_code = 'PAYROLL');

INSERT INTO expense_categories (name, system_code, created_at, updated_at)
SELECT 'Staff Meals', 'STAFF_MEAL', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE system_code = 'STAFF_MEAL');

CREATE UNIQUE INDEX expense_categories_system_code_index
  ON expense_categories(system_code)
  WHERE system_code IS NOT NULL;

CREATE TABLE payroll_runs (
  id INTEGER PRIMARY KEY,
  business_date TEXT NOT NULL CHECK (
    length(business_date) = 10 AND business_date GLOB '????-??-??'
  ),
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('CLOSED', 'REOPENED')),
  total_salary_centavos INTEGER NOT NULL CHECK (total_salary_centavos >= 0),
  total_meal_centavos INTEGER NOT NULL CHECK (total_meal_centavos >= 0),
  close_note TEXT NOT NULL DEFAULT '',
  reopen_reason TEXT,
  closed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reopened_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  closed_at TEXT NOT NULL,
  reopened_at TEXT
) STRICT;

CREATE UNIQUE INDEX payroll_runs_one_closed_date_index
  ON payroll_runs(business_date)
  WHERE status = 'CLOSED';

CREATE INDEX payroll_runs_date_history_index
  ON payroll_runs(business_date, id DESC);

CREATE TABLE payroll_run_items (
  id INTEGER PRIMARY KEY,
  payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_name_snapshot TEXT NOT NULL,
  fixed_daily_rate_centavos_snapshot INTEGER NOT NULL CHECK (
    fixed_daily_rate_centavos_snapshot >= 0
  ),
  labor_earned_centavos INTEGER NOT NULL CHECK (labor_earned_centavos >= 0),
  fixed_top_up_centavos INTEGER NOT NULL CHECK (fixed_top_up_centavos >= 0),
  total_pay_centavos INTEGER NOT NULL CHECK (total_pay_centavos >= 0),
  meal_cost_centavos INTEGER NOT NULL CHECK (meal_cost_centavos >= 0),
  UNIQUE (payroll_run_id, employee_id)
) STRICT;

CREATE INDEX payroll_run_items_run_index
  ON payroll_run_items(payroll_run_id, employee_id);

ALTER TABLE expense_transactions
ADD COLUMN payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX expense_transactions_payroll_source_index
  ON expense_transactions(payroll_run_id, source_type)
  WHERE payroll_run_id IS NOT NULL;
