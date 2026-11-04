"""
SOR SENTINEL — Main API v1 Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, analyses, dashboard, contact, admin, health, digikeeper, cubbis

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(analyses.router)
api_router.include_router(dashboard.router)
api_router.include_router(contact.router)
api_router.include_router(admin.router)
api_router.include_router(digikeeper.router)
api_router.include_router(cubbis.router)
