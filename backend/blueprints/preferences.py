"""
blueprints/preferences.py — User preference routes.

Preferences control which event categories appear in a user's calendar by default.
All endpoints require a valid JWT.

Access control:
    - A user may only read/update their own preferences.
    - An admin may read/update any user's preferences.

Routes:
    GET /users/<user_id>/preferences  — retrieve saved category list
    PUT /users/<user_id>/preferences  — replace saved category list
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from db import db
from models import UserPreference
from utils import CATEGORIES, error

preferences_bp = Blueprint("preferences", __name__, url_prefix="/users")


def _can_access(user_id: int) -> bool:
    """
    Return True if the current JWT identity is authorised to access this user's data.

    Allows access if:
    - The requester IS the user (same ID), OR
    - The requester is an admin (is_admin claim is True)
    """
    current_id = int(get_jwt_identity())
    return current_id == user_id or get_jwt().get("is_admin")


@preferences_bp.get("/<int:user_id>/preferences")
@jwt_required()
def get_preferences(user_id: int):
    """
    Return the list of category strings the user has saved.

    Returns 403 if the requester is not the user or an admin.
    Returns 200 with a list of category strings e.g. ["Cat 1", "Cat 3"].
    """
    if not _can_access(user_id):
        return error("Forbidden", 403)

    prefs = UserPreference.query.filter_by(user_id=user_id).all()
    return jsonify([p.category for p in prefs])


@preferences_bp.put("/<int:user_id>/preferences")
@jwt_required()
def update_preferences(user_id: int):
    """
    Replace the user's saved preferences with the provided category list.

    The entire preference set is replaced atomically — there is no partial update.
    Sending an empty list clears all preferences.

    Request body:
        { "categories": ["Cat 1", "Cat 2"] }

    Returns 400 if any category is not in the allowed CATEGORIES list.
    Returns 403 if the requester is not the user or an admin.
    Returns 200 with the saved categories on success.
    """
    if not _can_access(user_id):
        return error("Forbidden", 403)

    data = request.get_json()
    categories = data.get("categories", [])

    # Reject any category names that aren't in the allowed list
    invalid = [c for c in categories if c not in CATEGORIES]
    if invalid:
        return error(f"Invalid categories: {invalid}", 400)

    # Delete existing preferences and replace in one transaction
    UserPreference.query.filter_by(user_id=user_id).delete()
    for cat in categories:
        db.session.add(UserPreference(user_id=user_id, category=cat))
    db.session.commit()

    return jsonify({"categories": categories})
