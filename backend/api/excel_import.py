"""
Excel import module for Caleb Williams Card Collection
Parses the existing Excel format and imports to database
"""
import pandas as pd
from pathlib import Path
from datetime import datetime
from database import Card, insert_card, init_db, parse_population, get_connection


def import_excel(filepath: str) -> dict:
    """
    Import cards from Excel file

    Returns summary dict with counts
    """
    # Read Excel without headers first to find the header row
    df_raw = pd.read_excel(filepath, header=None)

    # Find the header row (row containing 'Year')
    header_row = None
    for idx, row in df_raw.iterrows():
        row_values = [str(v) for v in row.values]
        if 'Year' in row_values:
            header_row = idx
            break

    if header_row is None:
        raise ValueError("Could not find header row with 'Year' column")

    # Re-read with correct header
    df = pd.read_excel(filepath, header=header_row)

    # Clean column names - remove 'Unnamed' columns and strip whitespace
    df.columns = [str(col).strip() for col in df.columns]

    # Drop unnamed columns
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    owned_count = 0
    want_list_count = 0
    total_cost = 0.0
    errors = []

    for idx, row in df.iterrows():
        try:
            year = row.get('Year')
            if pd.isna(year) or year == 'Year':
                continue

            year = int(year)
            set_name = str(row.get('Set', '')).strip()
            parallel_rarity = str(row.get('Rarity / Type', '')).strip()

            if not set_name or not parallel_rarity:
                continue

            # Parse date acquired
            date_acquired = row.get('Date Acquired')
            if pd.isna(date_acquired):
                date_acquired = None
                is_owned = False
            else:
                if isinstance(date_acquired, datetime):
                    date_acquired = date_acquired.strftime('%Y-%m-%d')
                else:
                    date_acquired = str(date_acquired)
                is_owned = True

            # Parse graded status (checkbox: ☑ or ☐)
            graded_val = row.get('Graded?', '')
            is_graded = str(graded_val).strip() == '☑'

            # Grading company and grade
            grading_company = row.get('Grading Company')
            if pd.isna(grading_company):
                grading_company = None
            else:
                grading_company = str(grading_company).strip()

            grade = row.get('Grade')
            if pd.isna(grade):
                grade = None
            else:
                grade = float(grade)

            # Cost
            cost = row.get('Cost')
            if pd.isna(cost):
                cost = None
            else:
                cost = float(cost)
                if is_owned:
                    total_cost += cost

            # Authenticity guaranteed
            auth_val = row.get('Authenticity Guaranteed?', '')
            authenticity_guaranteed = str(auth_val).strip() == '☑'

            # Parse population from parallel name
            serial_number, population = parse_population(parallel_rarity)

            card = Card(
                id=None,
                year=year,
                set_name=set_name,
                parallel_rarity=parallel_rarity,
                serial_number=serial_number,
                population=population,
                date_acquired=date_acquired,
                is_graded=is_graded,
                grading_company=grading_company,
                grade=grade,
                cost_basis=cost,
                authenticity_guaranteed=authenticity_guaranteed,
                is_owned=is_owned
            )

            insert_card(card)

            if is_owned:
                owned_count += 1
            else:
                want_list_count += 1

        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    return {
        'owned_count': owned_count,
        'want_list_count': want_list_count,
        'total_cost_basis': total_cost,
        'errors': errors
    }


def clear_all_cards():
    """Clear all cards from database (for re-import)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cards")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    import sys

    # Initialize database
    init_db()

    # Get filepath from args or use default
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
    else:
        filepath = Path(__file__).parent.parent.parent / "data" / "Caleb Williams Rookie Collection.xlsx"

    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    print(f"Importing from: {filepath}")

    # Clear existing cards
    clear_all_cards()

    # Import
    result = import_excel(filepath)

    print("\n" + "=" * 50)
    print("IMPORT SUMMARY")
    print("=" * 50)
    print(f"Owned cards:     {result['owned_count']}")
    print(f"Want list cards: {result['want_list_count']}")
    print(f"Total cost basis: ${result['total_cost_basis']:,.2f}")

    if result['errors']:
        print(f"\nErrors ({len(result['errors'])}):")
        for err in result['errors']:
            print(f"  - {err}")

    print("\nImport complete!")
