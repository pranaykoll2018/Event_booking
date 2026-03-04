"""
blueprints/__init__.py — Blueprint registry.

Imports and exposes all blueprint instances so main.py can register them
with a clean single import:

    from blueprints import auth_bp, preferences_bp, slots_bp, bookings_bp

Adding a new feature area means:
1. Create blueprints/my_feature.py with a Blueprint instance
2. Import and add it to __all__ here
3. Register it in main.py — nothing else changes
"""

from .auth        import auth_bp
from .preferences import preferences_bp
from .slots       import slots_bp
from .bookings    import bookings_bp

__all__ = ["auth_bp", "preferences_bp", "slots_bp", "bookings_bp"]
