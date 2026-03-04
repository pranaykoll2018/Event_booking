"""

"""

import os
import sys
from sqlalchemy import create_engine, text

DB_USER     = os.getenv("DB_USER",     "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST     = os.getenv("DB_HOST",     "localhost")
DB_PORT     = os.getenv("DB_PORT",     "3306")
DB_NAME     = os.getenv("DB_NAME",     "event_booking")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def run():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:

        # ── Step 1: find all unique constraints on the bookings table ──────────
        result = conn.execute(text("""
            SELECT CONSTRAINT_NAME, COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = :db
              AND TABLE_NAME   = 'bookings'
              AND CONSTRAINT_NAME != 'PRIMARY'
        """), {"db": DB_NAME})

        rows = result.fetchall()
        constraints = {}
        for constraint_name, column_name in rows:
            constraints.setdefault(constraint_name, []).append(column_name)

        print("Existing constraints on bookings table:")
        for name, cols in constraints.items():
            print(f"  {name}: {cols}")

        # ── Step 2: drop any constraint that covers ONLY time_slot_id ─────────
        dropped = False
        for name, cols in constraints.items():
            if cols == ["time_slot_id"]:
                print(f"\nFound old single-column constraint '{name}' — dropping it...")
                conn.execute(text(f"ALTER TABLE bookings DROP INDEX `{name}`"))
                conn.commit()
                print(f"  ✓ Dropped '{name}'")
                dropped = True

        if not dropped:
            print("\nNo old single-column constraint found — nothing to drop.")

        # ── Step 3: ensure the composite constraint exists ────────────────────
        if "uq_slot_user" not in constraints:
            print("\nAdding composite unique constraint (time_slot_id, user_id)...")
            conn.execute(text("""
                ALTER TABLE bookings
                ADD CONSTRAINT uq_slot_user UNIQUE (time_slot_id, user_id)
            """))
            conn.commit()
            print("  ✓ Added 'uq_slot_user'")
        else:
            print("\nComposite constraint 'uq_slot_user' already exists — no action needed.")

        # ── Step 4: confirm final state ───────────────────────────────────────
        result = conn.execute(text("""
            SELECT CONSTRAINT_NAME, COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = :db
              AND TABLE_NAME   = 'bookings'
              AND CONSTRAINT_NAME != 'PRIMARY'
        """), {"db": DB_NAME})

        final = {}
        for constraint_name, column_name in result.fetchall():
            final.setdefault(constraint_name, []).append(column_name)

        print("\nFinal constraints on bookings table:")
        for name, cols in final.items():
            print(f"  {name}: {cols}")

        print("\n✓ Migration complete. Any number of users can now subscribe to the same event.")


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n✗ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
