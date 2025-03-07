/*
  # Balance Sheet Database Schema

  1. New Tables
    - `balance_sheets`
      - Main table for storing balance sheet records
      - Contains period dates, balances, and notes
    - `apartment_payments`
      - Stores apartment payment records for each balance sheet
    - `income_entries`
      - Stores additional income entries
    - `expense_entries`
      - Stores expense entries

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Balance Sheets Table
CREATE TABLE IF NOT EXISTS balance_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Apartment Payments Table
CREATE TABLE IF NOT EXISTS apartment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE,
  apartment_number text NOT NULL,
  resident_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Income Entries Table
CREATE TABLE IF NOT EXISTS income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Expense Entries Table
CREATE TABLE IF NOT EXISTS expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id uuid REFERENCES balance_sheets(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

-- Policies for balance_sheets
CREATE POLICY "Users can view their own balance sheets"
  ON balance_sheets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance sheets"
  ON balance_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance sheets"
  ON balance_sheets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for apartment_payments
CREATE POLICY "Users can manage apartment payments for their balance sheets"
  ON apartment_payments
  FOR ALL
  TO authenticated
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE user_id = auth.uid()
    )
  );

-- Policies for income_entries
CREATE POLICY "Users can manage income entries for their balance sheets"
  ON income_entries
  FOR ALL
  TO authenticated
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE user_id = auth.uid()
    )
  );

-- Policies for expense_entries
CREATE POLICY "Users can manage expense entries for their balance sheets"
  ON expense_entries
  FOR ALL
  TO authenticated
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE user_id = auth.uid()
    )
  );