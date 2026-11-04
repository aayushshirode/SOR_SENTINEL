"""
SOR SENTINEL — Auth Endpoints
"""
from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import register_user, login_user

from app.repositories import user_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    return register_user(db, user_data)


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Authenticate and receive JWT tokens.
    Supports both JSON payloads (frontend/API) and form-urlencoded data (OAuth2/Swagger UI).
    """
    content_type = request.headers.get("content-type", "").lower()

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        raw_email = form.get("username") or form.get("email")
        raw_password = form.get("password")
        raw_data = {"email": raw_email, "password": raw_password}
    else:
        try:
            raw_data = await request.json()
        except Exception:
            raise RequestValidationError([{"loc": ("body",), "msg": "Invalid JSON body", "type": "json_invalid"}])

        if not isinstance(raw_data, dict):
            raise RequestValidationError([{"loc": ("body",), "msg": "Input should be a valid dictionary", "type": "dict_type"}])

        if "email" not in raw_data and "username" in raw_data:
            raw_data["email"] = raw_data["username"]

    try:
        credentials = UserLogin(**raw_data)
    except ValidationError as err:
        raise RequestValidationError(err.errors())

    return login_user(db, credentials)


@router.post("/logout")
def logout():
    """
    Stateless logout — client must delete stored tokens.
    For future: implement token blocklist here.
    """
    return {"message": "Logged out successfully. Please delete your access token."}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    current_user.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return current_user
