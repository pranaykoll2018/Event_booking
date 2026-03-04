"""
migrate_bookings.py — Fix the bookings table constraint.

Drops the old UNIQUE(time_slot_id) constraint and replaces it with
a composite UNIQUE(time_slot_id, user_id).
"""

import os, sys
from sqlalchemy import create_engine, text

DB_USER     = os.getenv("DB_USER",     "pk")
DB_PASSWORD = os.getenv("DB_PASSWORD", "pk2025")
DB_HOST     = os.getenv("DB_HOST",     "localhost")
DB_PORT     = os.getenv("DB_PORT",     "3306")
DB_NAME     = os.getenv("DB_NAME",     "event_booking")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def run():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:

        # 1. Find all foreign keys on bookings so we can recreate them
        fk_rows = conn.execute(text("""
            SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'bookings'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        """), {"db": DB_NAME}).fetchall()

        print("Foreign keys found:")
        for row in fk_rows:
            print(f"  {row[0]}: {row[1]} -> {row[2]}.{row[3]}")

        # 2. Find unique constraints
        uq_rows = conn.execute(text("""
            SELECT DISTINCT INDEX_NAME, COLUMN_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'bookings'
              AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'
        """), {"db": DB_NAME}).fetchall()

        print("\nUnique indexes found:")
        uq_map = {}
        for index_name, col in uq_rows:
            uq_map.setdefault(index_name, []).append(col)
        for name, cols in uq_map.items():
            print(f"  {name}: {cols}")

        # 3. Check if old single-column unique on time_slot_id exists
        old_index = None
        for name, cols in uq_map.items():
            if cols == ["time_slot_id"]:
                old_index = name
                break

        if not old_index:
            print("\nNo old single-column unique index on time_slot_id found.")
        else:
            print(f"\nFound old index '{old_index}' — fixing...")

            # Drop FK constraints that reference time_slot_id index
            for fk_name, col, ref_table, ref_col in fk_rows:
                if col == "time_slot_id":
                    print(f"  Dropping FK {fk_name}...")
                    conn.execute(text(f"ALTER TABLE bookings DROP FOREIGN KEY `{fk_name}`"))
                    conn.commit()

            # Now drop the old unique index
            print(f"  Dropping index '{old_index}'...")
            conn.execute(text(f"ALTER TABLE bookings DROP INDEX `{old_index}`"))
            conn.commit()

            # Recreate the FK on time_slot_id
            print("  Recreating FK on time_slot_id...")
            conn.execute(text("""
                ALTER TABLE bookings
                ADD CONSTRAINT bookings_ibfk_1
                FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
            """))
            conn.commit()
            print("  Done.")

        # 4. Add composite unique if not already there
        if "uq_slot_user" not in uq_map:
            print("\nAdding composite unique (time_slot_id, user_id)...")
            conn.execute(text("""
                ALTER TABLE bookings
                ADD CONSTRAINT uq_slot_user UNIQUE (time_slot_id, user_id)
            """))
            conn.commit()
            print("  ✓ Added uq_slot_user")
        else:
            print("\nuq_slot_user already exists — skipping.")

        print("\n✓ Migration complete. Multiple users can now subscribe to the same event.")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n✗ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)