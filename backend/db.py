"""
db.py — Shared SQLAlchemy instance.

We define the SQLAlchemy `db` object here rather than in main.py to avoid
circular imports. If models imported `db` from main.py, and main.py imported
models, Python would fail with a circular import error.

Usage:
    from db import db
    class MyModel(db.Model): ...
"""

from flask_sqlalchemy import SQLAlchemy

# Single shared SQLAlchemy instance — initialised later via db.init_app(app)
# inside the application factory (main.py).
db = SQLAlchemy()
