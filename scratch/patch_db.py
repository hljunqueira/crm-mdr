import os
import re
import sqlite3

def patch_database():
    appdata = os.environ.get('APPDATA')
    if not appdata:
        print("APPDATA environment variable not found.")
        return

    db_path = os.path.join(appdata, 'react-example', 'database.db')
    print(f"Connecting to SQLite database: {db_path}")
    if not os.path.exists(db_path):
        print("Database file does not exist!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    migration_file = os.path.join(os.path.dirname(__file__), '../server/db/migrations/0000_serious_purple_man.sql')
    print(f"Reading migration file: {migration_file}")
    if not os.path.exists(migration_file):
        print("Migration file not found!")
        return

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split statements
    statements = sql_content.split('--> statement-breakpoint')

    for stmt in statements:
        trimmed = stmt.strip()
        if not trimmed:
            continue

        # Parse CREATE TABLE
        create_table_match = re.match(r'CREATE TABLE\s+`?(\w+)`?\s*\((.*)\)', trimmed, re.DOTALL | re.IGNORECASE)
        if create_table_match:
            table_name = create_table_match.group(1)
            columns_def = create_table_match.group(2)
            
            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                print(f"Table '{table_name}' does not exist. Creating...")
                try:
                    cursor.execute(trimmed)
                    print(f"Successfully created table '{table_name}'.")
                except Exception as e:
                    print(f"Error creating table '{table_name}': {e}")
            else:
                # Table exists. Let's verify columns.
                cursor.execute(f"PRAGMA table_info(`{table_name}`)")
                existing_cols = {row[1].lower(): row[2] for row in cursor.fetchall()}
                
                # Parse columns from columns_def
                # We split columns_def by comma, but need to be careful with FOREIGN KEYs and constraints
                lines = [line.strip() for line in columns_def.split('\n')]
                for line in lines:
                    if not line:
                        continue
                    if line.upper().startswith('FOREIGN KEY') or line.upper().startswith('PRIMARY KEY') or line.upper().startswith('UNIQUE'):
                        continue
                    
                    col_match = re.match(r'^`?(\w+)`?\s+(\w+)', line)
                    if col_match:
                        col_name = col_match.group(1)
                        col_type = col_match.group(2)
                        
                        if col_name.lower() not in existing_cols:
                            print(f"Column '{col_name}' ({col_type}) is missing in table '{table_name}'. Adding...")
                            alter_query = f"ALTER TABLE `{table_name}` ADD COLUMN `{col_name}` {col_type}"
                            try:
                                cursor.execute(alter_query)
                                print(f"Successfully added column '{col_name}' to table '{table_name}'.")
                            except Exception as e:
                                print(f"Error adding column '{col_name}' to table '{table_name}': {e}")
        else:
            # Run index or other creations
            try:
                cursor.execute(trimmed)
            except sqlite3.OperationalError as e:
                if "already exists" in str(e):
                    pass
                else:
                    print(f"SQL statement info: {e} for {trimmed[:50]}...")
            except Exception as e:
                print(f"SQL statement error: {e} for {trimmed[:50]}...")

    # Clear drizzle migrations cache to force alignment
    try:
        cursor.execute("DROP TABLE IF EXISTS __drizzle_migrations")
        print("Cleared __drizzle_migrations table.")
    except Exception as e:
        print(f"Error clearing migrations table: {e}")

    conn.commit()
    conn.close()
    print("Database patched successfully.")

if __name__ == '__main__':
    patch_database()
