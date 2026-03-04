"""
blueprints/bookings.py — Booking (subscription) routes.

Design decisions:
    - Any number of users can subscribe to the same slot (no capacity limit).
    - A user cannot subscribe to the same slot more than once.
    - User identity comes from the JWT — no user_id is accepted in the request,
      which prevents users from booking or cancelling on behalf of others.

Routes:
    POST   /slots/<id>/book   — subscribe the current user to a slot
    DELETE /slots/<id>/book   — unsubscribe the current user from a slot
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import db
from models import TimeSlot, Booking
from utils import error

bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.post("/slots/<int:slot_id>/book")
@jwt_required()
def book_slot(slot_id: int):
    """
    Subscribe the current user to a time slot.

    The user ID is extracted from the JWT — not from the request body.
    This means a user can only ever book as themselves.

    Returns 404 if the slot does not exist.
    Returns 409 if the user has already booked this slot.
    Returns 200 with a success message on successful booking.
    """
    # Extract the user's ID from their JWT token
    user_id = int(get_jwt_identity())

    # Verify the slot exists before attempting to book
    if not TimeSlot.query.get(slot_id):
        return error("Slot not found", 404)

    # Prevent duplicate bookings — one user can only subscribe once per slot.
    # The DB also enforces this via the uq_slot_user constraint as a safety net.
    existing = Booking.query.filter_by(time_slot_id=slot_id, user_id=user_id).first()
    if existing:
        return error("You have already booked this slot", 409)

    db.session.add(Booking(time_slot_id=slot_id, user_id=user_id))
    db.session.commit()
    return jsonify({"detail": "Booked successfully"})


@bookings_bp.delete("/slots/<int:slot_id>/book")
@jwt_required()
def cancel_booking(slot_id: int):
    """
    Unsubscribe the current user from a time slot.

    Only the user who made the booking can cancel it (identity from JWT).
    Admins cancelling on behalf of users is not supported here — use
    DELETE /slots/<id> to remove the entire slot and all its bookings.

    Returns 404 if no booking exists for this user + slot combination.
    Returns 200 with a success message on successful cancellation.
    """
    # Extract the user's ID from their JWT token
    user_id = int(get_jwt_identity())

    # Find the specific booking for this user + slot combination
    booking = Booking.query.filter_by(
        time_slot_id=slot_id,
        user_id=user_id,
    ).first()

    if not booking:
        return error("No booking found", 404)

    db.session.delete(booking)
    db.session.commit()
    return jsonify({"detail": "Cancelled successfully"})
