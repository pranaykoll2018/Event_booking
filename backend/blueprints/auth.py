"""
blueprints/auth.py — Authentication routes.

All endpoints here are PUBLIC — no JWT required.
The login endpoint is where JWTs are issued.

Routes:
    POST /auth/register  — create a new user account
    POST /auth/login     — validate credentials and receive a JWT
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from datetime import timedelta

from db import db
from models import User
from utils import hash_password, error

# url_prefix="/auth" means all routes here are automatically under /auth/
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/register")
def register():
    """
    Create a new user account.

    Request body:
        { "username": str, "password": str, "is_admin": bool (optional) }

    Returns 400 if username is already taken.
    Returns 201 with the new user object on success.
    """
    data = request.get_json()

    # Basic presence validation before touching the database
    if not data.get("username") or not data.get("password"):
        return error("username and password are required", 400)

    # Usernames must be unique — check before attempting insert
    if User.query.filter_by(username=data["username"]).first():
        return error("Username already taken", 400)

    user = User(
        username=data["username"],
        password=hash_password(data["password"]),  # never store plain text
        is_admin=int(data.get("is_admin", False)),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@auth_bp.post("/login")
def login():
    """
    Validate credentials and return a signed JWT.

    Request body:
        { "username": str, "password": str }

    The JWT payload includes:
        - sub (subject): the user's ID as a string
        - is_admin: role claim used by @admin_required without a DB lookup
        - exp: expiry timestamp (8 hours from now)

    Returns 401 if credentials are invalid.
    Returns 200 with { access_token, user } on success.
    """
    data = request.get_json()

    user = User.query.filter_by(
        username=data.get("username"),
        password=hash_password(data.get("password", "")),
    ).first()

    if not user:
        return error("Invalid credentials", 401)

    # Embed the admin role as a custom claim so protected routes
    # can authorise without an extra DB query on every request.
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"is_admin": bool(user.is_admin)},
        expires_delta=timedelta(hours=8),
    )
    return jsonify({"access_token": access_token, "user": user.to_dict()})



