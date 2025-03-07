/*
  # Balance Sheet Tables

  1. New Tables
    - `balance_sheets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `start_date` (date)
      - `end_date` (date)
      - `start_balance` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `apartment_payments`
      - `id` (uuid, primary key)
      - `balance_sheet_id` (uuid, references balance_sheets)
      - `apartment_number` (text)
      - `resident_name` (text)
      - `amount` (numeric)
      - `paid` (boolean)

    - `income_entries`
      - `id` (uuid, primary key)
      - `balance_sheet_id` (uuid, references balance_sheets)
      - `description` (text)
      - `amount` (numeric)
      - `image_url` (text)

    - `expense_entries`
      - `id` (uuid, primary key)
      - `balance_sheet_id` (uuid, references balance_sheets)
      - `description` (text)
      - `amount` (numeric)
      - `image_url` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own balance sheets and related data
      - Create new balance sheets and related data
*/

-- Create balance_sheets table
CREATE TABLE IF NOT EXISTS balance_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_balance numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create apartment_payments table
CREATE TABLE IF NOT EXISTS apartment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE NOT NULL,
  apartment_number text NOT NULL,
  resident_name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false
);

-- Create income_entries table
CREATE TABLE IF NOT EXISTS income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  image_url text
);

-- Create expense_entries table
CREATE TABLE IF NOT EXISTS expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  image_url text
);

-- Enable RLS on all tables
ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for balance_sheets
CREATE POLICY "Users can view own balance sheets"
  ON balance_sheets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create balance sheets"
  ON balance_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for apartment_payments
CREATE POLICY "Users can view own apartment payments"
  ON apartment_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = apartment_payments.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create apartment payments"
  ON apartment_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = apartment_payments.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );

-- Create policies for income_entries
CREATE POLICY "Users can view own income entries"
  ON income_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = income_entries.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create income entries"
  ON income_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = income_entries.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );

-- Create policies for expense_entries
CREATE POLICY "Users can view own expense entries"
  ON expense_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = expense_entries.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expense entries"
  ON expense_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM balance_sheets
      WHERE balance_sheets.id = expense_entries.balance_sheet_id
      AND balance_sheets.user_id = auth.uid()
    )
  );