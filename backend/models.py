"""
models.py — SQLAlchemy ORM models.

Each class maps to a database table. Relationships are declared here so
SQLAlchemy can handle joins and cascading deletes automatically.
"""

from db import db


class User(db.Model):
    """
    Represents an application user.
    A user can be a regular user (is_admin=0) or an admin (is_admin=1).
    """
    __tablename__ = "users"

    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # stored as SHA-256 hash
    is_admin = db.Column(db.Integer, default=0, nullable=False)  # 0=user, 1=admin

    # One user → many preferences (deleted with user)
    preferences = db.relationship(
        "UserPreference", back_populates="user", cascade="all, delete-orphan"
    )
    # One user → many bookings (deleted with user)
    bookings = db.relationship(
        "Booking", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Return a safe public representation — never exposes the password."""
        return {"id": self.id, "username": self.username, "is_admin": bool(self.is_admin)}


class UserPreference(db.Model):
    """
    Stores which event categories a user wants to see in their calendar.
    Each row is one category selection for one user.
    """
    __tablename__ = "user_preferences"

    id       = db.Column(db.Integer, primary_key=True)
    user_id  = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category = db.Column(db.String(10), nullable=False)  # one of CATEGORIES in utils.py

    user = db.relationship("User", back_populates="preferences")


class TimeSlot(db.Model):
    """
    A bookable event time slot created by an admin.
    Multiple users can subscribe to the same slot.
    """
    __tablename__ = "time_slots"

    id         = db.Column(db.Integer, primary_key=True)
    title      = db.Column(db.String(150), nullable=False)
    category   = db.Column(db.String(10), nullable=False)   # one of CATEGORIES in utils.py
    start_time = db.Column(db.DateTime, nullable=False)
    end_time   = db.Column(db.DateTime, nullable=False)     # always > start_time (validated in route)

    # One slot → many bookings (one per user). Deleting a slot removes all its bookings.
    bookings = db.relationship(
        "Booking", back_populates="time_slot", cascade="all, delete-orphan"
    )

    def to_dict(self, current_user_id: int = None):
        """
        Serialise the slot for API responses.

        Args:
            current_user_id: When provided, booked_by_me reflects whether
                             this specific user has subscribed to the slot.
        """
        return {
            "id":            self.id,
            "title":         self.title,
            "category":      self.category,
            "start_time":    self.start_time.isoformat(),
            "end_time":      self.end_time.isoformat(),
            # Total number of users subscribed to this slot
            "booking_count": len(self.bookings),
            # True only if the requesting user has booked this slot
            "booked_by_me":  any(b.user_id == current_user_id for b in self.bookings)
                             if current_user_id else False,
        }


class Booking(db.Model):
    """
    Records a single user's subscription to a single time slot.

    Constraints:
    - A user can only book the same slot once (uq_slot_user).
    - Multiple different users CAN book the same slot (no limit on slot capacity).
    """
    __tablename__ = "bookings"

    id           = db.Column(db.Integer, primary_key=True)
    time_slot_id = db.Column(db.Integer, db.ForeignKey("time_slots.id"), nullable=False)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Composite unique constraint — prevents the same user booking the same slot twice.
    # This is the DB-level safety net; the application also checks before inserting.
    __table_args__ = (
        db.UniqueConstraint("time_slot_id", "user_id", name="uq_slot_user"),
    )

    time_slot = db.relationship("TimeSlot", back_populates="bookings")
    user      = db.relationship("User", back_populates="bookings")
