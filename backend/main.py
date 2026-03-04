"""
main.py — Application factory.

This file's only job is to create and configure the Flask app.
No routes live here — all routes are in their respective blueprints.

Using the application factory pattern (create_app) means:
- Easy to test: call create_app() with a test config in test files
- No circular imports: extensions are initialised after the app is created
- Clean separation: config, extensions, and routing are each in one place
"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os

from db import db
from blueprints import auth_bp, preferences_bp, slots_bp, bookings_bp


def create_app() -> Flask:
    """
    Create and configure a Flask application instance.

    All configuration is read from environment variables so no secrets
    are ever committed to source control. Sensible defaults are provided
    for local development only — always override in production.

    Returns:
        A fully configured Flask application.
    """
    app = Flask(__name__)

    # ------------------------------------------------------------------
    # Database configuration (MySQL via PyMySQL)
    # ------------------------------------------------------------------
    DB_USER     = os.getenv("DB_USER",     "pk")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "pk2025")
    DB_HOST     = os.getenv("DB_HOST",     "localhost")
    DB_PORT     = os.getenv("DB_PORT",     "3306")
    DB_NAME     = os.getenv("DB_NAME",     "event_booking")

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    # Disable modification tracking — not needed and wastes memory
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Tell MySQL to use the same timezone as the app (no UTC conversion on read/write)
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": {"init_command": "SET time_zone = '+00:00'"}
    }

    # ------------------------------------------------------------------
    # JWT configuration
    # JWT_SECRET_KEY must be a long random string in production.
    # Tokens expire after 8 hours — users must re-login after that.
    # ------------------------------------------------------------------
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me-in-production")

    # ------------------------------------------------------------------
    # Extensions — initialised here so they share the app context
    # ------------------------------------------------------------------
    db.init_app(app)                           # SQLAlchemy ORM
    JWTManager(app)                            # JWT encode/decode
    CORS(app, origins=["http://localhost:4200"])  # Allow Angular dev server

    # ------------------------------------------------------------------
    # Blueprints — each blueprint owns one domain of the API
    # ------------------------------------------------------------------
    app.register_blueprint(auth_bp)         # /auth/*
    app.register_blueprint(preferences_bp)  # /users/<id>/preferences
    app.register_blueprint(slots_bp)        # /slots, /categories
    app.register_blueprint(bookings_bp)     # /slots/<id>/book

    # ------------------------------------------------------------------
    # Database setup — creates tables if they don't exist yet
    # ------------------------------------------------------------------
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    # Entry point for local development.
    # In production use a proper WSGI server: gunicorn main:create_app()
    create_app().run(debug=True, port=8000)