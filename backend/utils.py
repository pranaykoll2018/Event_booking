"""
utils.py — Shared helpers used across all blueprints.

Centralising these here means:
- CATEGORIES is defined once — no risk of inconsistency between blueprints
- error() produces a uniform JSON response shape throughout the API
- admin_required can be applied to any route with a single decorator
"""

from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps


# The only valid event categories in the system.
# Used for validation on slot creation and preference updates.
CATEGORIES = ["Cat 1", "Cat 2", "Cat 3"]


def hash_password(plain: str) -> str:
    """
    Return a SHA-256 hex digest of the given plain-text password.
    Passwords are never stored or compared in plain text.
    """
    import hashlib
    return hashlib.sha256(plain.encode()).hexdigest()


def error(msg: str, status: int):
    """
    Return a consistent JSON error envelope.

    All API errors use this helper so clients always receive the same shape:
        { "detail": "<message>" }

    Args:
        msg:    Human-readable error message.
        status: HTTP status code (400, 401, 403, 404, 409, etc.)
    """
    return jsonify({"detail": msg}), status


def admin_required(fn):
    """
    Route decorator that allows access only to admin users.

    Stacks on top of @jwt_required() — validates the token first,
    then checks the 'is_admin' custom claim embedded at login.

    Usage:
        @app.post("/slots")
        @admin_required
        def create_slot():
            ...

    Returns 403 if the token is valid but the user is not an admin.
    Returns 401 if the token is missing or invalid (handled by JWT).
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if not get_jwt().get("is_admin"):
            return error("Admin access required", 403)
        return fn(*args, **kwargs)
    return wrapper
