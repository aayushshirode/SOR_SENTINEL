"""
SOR SENTINEL — User Profile & Avatar Endpoints
"""
import os
import re
import time
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange, FeedbackSubmission, ReviewSubmission
from app.repositories import user_repository
from app.services.auth_service import change_password

router = APIRouter(prefix="/users", tags=["Users"])

# Avatar upload configuration
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
_AVATAR_UPLOAD_DIR = _BACKEND_DIR / "uploads" / "avatars"
_AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_AVATAR_EXTS = {".jpg", ".jpeg", ".png"}
ALLOWED_AVATAR_MIMES = {"image/jpeg", "image/png"}
FILENAME_SAFE_REGEX = re.compile(r"^[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$")


@router.get("/me", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get the current user's profile with previous login time."""
    current_user.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return current_user


@router.put("/me", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    updated = user_repository.update_user(db, current_user.id, data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    updated.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return updated


@router.post("/me/change-password")
def change_my_password(
    pw_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password."""
    change_password(db, current_user.id, pw_data)
    return {"message": "Password changed successfully."}


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Upload and update the user's profile picture.
    Validates file extension, MIME type, size limit (2 MB), and magic bytes.
    Prevents path traversal by generating a synthetic filename.
    """
    original_filename = file.filename or ""
    ext = Path(original_filename).suffix.lower()

    if ext not in ALLOWED_AVATAR_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Only .jpg, .jpeg, and .png images are permitted.",
        )

    if file.content_type not in ALLOWED_AVATAR_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image MIME type. Only JPEG and PNG images are permitted.",
        )

    # Read and validate file content
    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 2 MB limit. Please upload a smaller image.",
        )

    if len(contents) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted.",
        )

    # Magic byte validation
    is_jpeg = contents.startswith(b"\xff\xd8\xff")
    is_png = contents.startswith(b"\x89PNG\r\n\x1a\n")
    if not (is_jpeg or is_png):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File contents do not match valid JPEG or PNG image signatures.",
        )

    # Delete previous avatar file if exists
    if current_user.avatar_url and "/api/v1/users/avatar/" in current_user.avatar_url:
        old_fname = current_user.avatar_url.split("/api/v1/users/avatar/")[-1]
        old_path = _AVATAR_UPLOAD_DIR / old_fname
        if old_path.exists():
            try:
                old_path.unlink()
            except OSError:
                pass

    # Save new avatar with synthetic safe filename
    new_ext = ".jpg" if is_jpeg else ".png"
    safe_filename = f"avatar_user_{current_user.id}_{int(time.time())}{new_ext}"
    target_path = _AVATAR_UPLOAD_DIR / safe_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    # Update database record
    avatar_url = f"/api/v1/users/avatar/{safe_filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    current_user.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
def remove_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Remove the user's custom profile picture and reset to default."""
    if current_user.avatar_url and "/api/v1/users/avatar/" in current_user.avatar_url:
        old_fname = current_user.avatar_url.split("/api/v1/users/avatar/")[-1]
        old_path = _AVATAR_UPLOAD_DIR / old_fname
        if old_path.exists():
            try:
                old_path.unlink()
            except OSError:
                pass

    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)

    current_user.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return current_user


@router.get("/avatar/{filename}")
def get_avatar(filename: str):
    """Safely serve an uploaded avatar image with path traversal protection."""
    if not FILENAME_SAFE_REGEX.match(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image filename format.",
        )

    file_path = _AVATAR_UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar image not found.",
        )

    media_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/feedback")
def submit_user_feedback(
    data: FeedbackSubmission,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit user feedback or bug report, persisted to Oracle database."""
    from app.models.contact import ContactMessage
    category_title = data.category.replace("_", " ").title()
    msg = ContactMessage(
        name=current_user.full_name,
        email=current_user.email,
        subject=f"[User Feedback - {category_title}] UID #{current_user.id}",
        message=data.message.strip(),
        status="unread",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"message": "Feedback submitted successfully.", "id": msg.id}


@router.post("/review")
def submit_user_review(
    data: ReviewSubmission,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit platform rating and review, persisted to Oracle database."""
    from app.models.contact import ContactMessage
    review_text = (data.review or "").strip() or "No written review provided."
    msg = ContactMessage(
        name=current_user.full_name,
        email=current_user.email,
        subject=f"[Platform Review: {data.rating}/5 Stars] UID #{current_user.id}",
        message=f"Rating: {data.rating}/5 Stars\nReview: {review_text}",
        status="unread",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"message": "Review submitted successfully.", "id": msg.id}
