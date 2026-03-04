"""
blueprints/slots.py — Time slot management routes.

Admins create and delete slots. Any authenticated user can list them.
The list endpoint is filterable by date range and category.

Routes:
    GET    /categories       — list valid categories (public)
    GET    /slots            — list slots with optional filters (JWT required)
    POST   /slots            — create a new slot (admin only)
    DELETE /slots/<id>       — delete a slot and all its bookings (admin only)
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from datetime import datetime

from db import db
from models import TimeSlot, Booking
from utils import CATEGORIES, error, admin_required

slots_bp = Blueprint("slots", __name__)


@slots_bp.get("/categories")
def get_categories():
    """
    Return the list of valid event categories.
    Public endpoint — no authentication required.
    Used by the frontend to populate category dropdowns and filters.
    """
    return jsonify(CATEGORIES)


@slots_bp.get("/slots")
@jwt_required()
def list_slots():
    """
    Return a list of time slots, optionally filtered by week and category.

    The current user's ID is read from the JWT so each slot's
    'booked_by_me' field reflects whether THIS user has subscribed.

    Query parameters:
        week_start  (ISO datetime) — include slots starting on or after this time
        week_end    (ISO datetime) — include slots starting before this time
        categories  (str)         — comma-separated list e.g. "Cat 1,Cat 3"

    Returns 200 with a list of serialised TimeSlot objects.
    """
    # Identity from JWT — used to populate booked_by_me on each slot
    current_user_id = int(get_jwt_identity())

    # Eagerly load bookings + their users in one query to avoid N+1 queries
    query = TimeSlot.query.options(
        joinedload(TimeSlot.bookings).joinedload(Booking.user)
    )

    week_start = request.args.get("week_start")
    week_end   = request.args.get("week_end")
    categories = request.args.get("categories")

    # Apply date range filter if both bounds are provided
    if week_start and week_end:
        # Strip timezone — compare as naive datetimes matching how they are stored
        query = query.filter(
            TimeSlot.start_time >= datetime.fromisoformat(week_start.replace("Z", "").split("+")[0]),
            TimeSlot.start_time <  datetime.fromisoformat(week_end.replace("Z", "").split("+")[0]),
        )

    # Apply category filter if provided
    if categories:
        cat_list = [c.strip() for c in categories.split(",")]
        query = query.filter(TimeSlot.category.in_(cat_list))

    slots = query.order_by(TimeSlot.start_time).all()

    # Pass current_user_id so to_dict() can set booked_by_me correctly
    return jsonify([s.to_dict(current_user_id) for s in slots])


@slots_bp.post("/slots")
@admin_required  # 403 if not admin, 401 if no/invalid token
def create_slot():
    """
    Create a new time slot.

    Request body:
        {
            "title":      str,
            "category":   str,       # must be one of CATEGORIES
            "start_time": ISO str,
            "end_time":   ISO str    # must be after start_time
        }

    Returns 400 for invalid category or if end_time <= start_time.
    Returns 201 with the created slot on success.
    """
    data = request.get_json()

    if data.get("category") not in CATEGORIES:
        return error("Invalid category", 400)

    raw_start = data["start_time"]
    raw_end   = data["end_time"]
    print(f"[DEBUG] raw start_time received: {raw_start}", flush=True)
    print(f"[DEBUG] raw end_time received:   {raw_end}", flush=True)

    start = datetime.fromisoformat(raw_start.replace("Z", "").split("+")[0])
    end   = datetime.fromisoformat(raw_end.replace("Z", "").split("+")[0])

    print(f"[DEBUG] parsed start: {start}", flush=True)
    print(f"[DEBUG] parsed end:   {end}", flush=True)

    if end <= start:
        return error("end_time must be after start_time", 400)

    slot = TimeSlot(
        title=data["title"],
        category=data["category"],
        start_time=start,
        end_time=end,
    )
    db.session.add(slot)
    db.session.commit()
    print(f"[DEBUG] stored start_time: {slot.start_time}", flush=True)
    print(f"[DEBUG] to_dict: {slot.to_dict()}", flush=True)
    return jsonify(slot.to_dict()), 201


@slots_bp.delete("/slots/<int:slot_id>")
@admin_required  # 403 if not admin, 401 if no/invalid token
def delete_slot(slot_id: int):
    """
    Delete a time slot and all of its bookings.

    Cascade delete is configured on the TimeSlot → Booking relationship,
    so all associated bookings are removed automatically.

    Returns 404 if the slot does not exist.
    Returns 204 (no content) on success.
    """
    slot = TimeSlot.query.get_or_404(slot_id)
    db.session.delete(slot)
    db.session.commit()
    return "", 204