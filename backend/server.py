from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
ACCESS_EXPIRE_MIN = 60 * 24  # 24h for convenience in LMS
REFRESH_EXPIRE_DAYS = 30


# ---------- Default course content (framework only — real content added later) ----------
DEFAULT_MODULES = [
    {
        "id": 1,
        "title": "Rules of the Road",
        "subtitle": "Traffic laws, signs, and right-of-way fundamentals.",
        "image_url": "https://images.unsplash.com/photo-1557404763-69708cd8b9ce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwxfHx0cmFmZmljJTIwbGlnaHQlMjBpbnRlcnNlY3Rpb24lMjB1cmJhbnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 150,
    },
    {
        "id": 2,
        "title": "The Vehicle and its Components",
        "subtitle": "Know your car. Controls, fluids, tires, lights.",
        "image_url": "https://images.unsplash.com/photo-1654616111851-5394318e3279?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBiYXklMjBjbGVhbnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 130,
    },
    {
        "id": 3,
        "title": "Vehicle Handling",
        "subtitle": "Steering, braking, accelerating. Smooth and safe.",
        "image_url": "https://images.unsplash.com/photo-1611448746128-7c39e03b71e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxkcml2ZXIlMjBoYW5kcyUyMG9uJTIwc3RlZXJpbmclMjB3aGVlbCUyMHN1bnNldHxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 160,
    },
    {
        "id": 4,
        "title": "Driver Behaviour",
        "subtitle": "Attitude, decisions, and emotional control behind the wheel.",
        "image_url": "https://images.unsplash.com/photo-1640040104532-9fccaa7b408d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxyZWFyJTIwdmlldyUyMG1pcnJvciUyMGRyaXZpbmd8ZW58MHx8fHwxNzgwOTAzNTAyfDA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 150,
    },
    {
        "id": 5,
        "title": "Respect and Responsibility",
        "subtitle": "Sharing public roads with courtesy and care.",
        "image_url": "https://images.unsplash.com/photo-1624566842042-2c3a03ab8d19?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxwZWRlc3RyaWFuJTIwY3Jvc3NpbmclMjBzdHJlZXQlMjB1cmJhbnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 140,
    },
    {
        "id": 6,
        "title": "Sharing the Road",
        "subtitle": "Cyclists, motorcyclists, trucks, emergency vehicles.",
        "image_url": "https://images.unsplash.com/photo-1611147533125-9ca445f32036?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxoaWdod2F5JTIwdHJhZmZpYyUyMGNhcnMlMjBkcml2aW5nfGVufDB8fHx8MTc4MDkwMzUwMnww&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 150,
    },
    {
        "id": 7,
        "title": "Attention",
        "subtitle": "Focus, scanning, and avoiding distractions.",
        "image_url": "https://images.unsplash.com/photo-1610741083757-1ae88e1a17f7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxyYWlueSUyMGRyaXZpbmclMjB3aW5kc2hpZWxkJTIwd2lwZXJzfGVufDB8fHx8MTc4MDkwMzUwMnww&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 130,
    },
    {
        "id": 8,
        "title": "Perception and Risk Management",
        "subtitle": "Hazard perception, defensive driving, decision-making.",
        "image_url": "https://images.pexels.com/photos/31748180/pexels-photo-31748180.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "duration_minutes": 190,
    },
]


def _placeholder_slides(module_id: int, module_title: str) -> List[dict]:
    """Generates 6 placeholder slides per module — real content will be added later."""
    slides = [
        {"id": f"m{module_id}-s1", "title": "Introduction", "body": f"Welcome to Module {module_id}: {module_title}. This module is part of Ontario's MTO-approved Beginner Driver Education program. Content will be added by your instructor."},
        {"id": f"m{module_id}-s2", "title": "Course Syllabus", "body": "The purpose of this course is to provide a foundation for safe and responsible driving and to help develop positive driving attitudes and behaviours in new drivers."},
        {"id": f"m{module_id}-s3", "title": "Key Concepts", "body": "Content placeholder. Your instructor will fill in the lesson material, diagrams, and embedded videos here."},
        {"id": f"m{module_id}-s4", "title": "Examples & Scenarios", "body": "Real-world driving scenarios will be presented here to reinforce the concepts covered earlier in the module."},
        {"id": f"m{module_id}-s5", "title": "Best Practices", "body": "MTO-recommended best practices and safety guidance will be summarised in this section."},
        {"id": f"m{module_id}-s6", "title": "Module Summary", "body": "A recap of what you've learned. Complete the module quiz to mark this module as complete."},
    ]
    return slides


def _placeholder_quiz(module_id: int) -> List[dict]:
    return [
        {
            "id": f"m{module_id}-q1",
            "question": f"Sample question 1 for Module {module_id} — your instructor will replace with the real MTO question.",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0,
        },
        {
            "id": f"m{module_id}-q2",
            "question": f"Sample question 2 for Module {module_id}.",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 1,
        },
        {
            "id": f"m{module_id}-q3",
            "question": f"Sample question 3 for Module {module_id}.",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 2,
        },
    ]


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=ACCESS_EXPIRE_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=REFRESH_EXPIRE_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- Pydantic models ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class EnrollIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str


class SlideProgressIn(BaseModel):
    module_id: int
    slide_id: str
    seconds: int = Field(ge=0, le=3600)


class QuizSubmitIn(BaseModel):
    module_id: int
    answers: List[int]  # selected option index per question


class SnapshotNoteIn(BaseModel):
    note: str = Field(default="", max_length=300)


# Snapshot config
SNAPSHOT_RETENTION = 10
SNAPSHOT_LOGIN_DEBOUNCE_HOURS = 6  # don't create login snapshot more than once per 6h


# ---------- Lifespan: seed admin + indexes + modules ----------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.modules.create_index("id", unique=True)
    await db.progress.create_index([("user_id", 1), ("module_id", 1)])
    await db.progress_snapshots.create_index([("user_id", 1), ("taken_at", -1)])
    await db.progress_snapshots.create_index("id", unique=True)

    # seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Safe2Drive Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # seed demo student
    student_email = "student@safe2drive.ca"
    student_password = "Student@2026"
    existing_student = await db.users.find_one({"email": student_email})
    if not existing_student:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": student_email,
            "name": "Demo Student",
            "password_hash": hash_password(student_password),
            "role": "student",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # seed modules (idempotent)
    for m in DEFAULT_MODULES:
        await db.modules.update_one(
            {"id": m["id"]},
            {"$set": {
                **m,
                "slides": _placeholder_slides(m["id"], m["title"]),
                "quiz": _placeholder_quiz(m["id"]),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    yield
    client.close()


app = FastAPI(lifespan=lifespan)
api = APIRouter(prefix="/api")


# ---------- Health ----------
@api.get("/")
async def root():
    return {"message": "Safe2Drive LMS API", "status": "ok"}


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    """Disabled — students are enrolled by admins. Kept for compatibility but rejects."""
    raise HTTPException(status_code=403, detail="Self-registration is disabled. Please contact Safe2Drive Ontario to be enrolled.")


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    # Auto-snapshot progress on student login (debounced)
    if user.get("role") == "student":
        try:
            await _create_snapshot(user["id"], reason="login", note="Session login")
        except Exception as e:
            logging.getLogger(__name__).warning(f"Login snapshot failed: {e}")
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"],
        "token": access,
    }


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "must_change_password": False}},
    )
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return full or user


# ---------- Progress helpers ----------
async def _get_progress(user_id: str, module_id: int) -> dict:
    doc = await db.progress.find_one({"user_id": user_id, "module_id": module_id})
    if doc:
        doc.pop("_id", None)
        return doc
    return {
        "user_id": user_id,
        "module_id": module_id,
        "watched_seconds": 0,
        "watched_slide_ids": [],
        "quiz_attempted": False,
        "quiz_score_pct": 0,
        "quiz_passed": False,
        "homework_complete": False,
        "module_complete": False,
        "last_slide_id": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- Snapshot helpers (cloud progress backup) ----------
async def _build_snapshot_payload(user_id: str) -> dict:
    """Capture a full progress payload for a user across all modules."""
    progress_docs = await db.progress.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    modules_completed = sum(1 for p in progress_docs if p.get("module_complete"))
    total_watched_seconds = sum(p.get("watched_seconds", 0) for p in progress_docs)
    total_modules = await db.modules.count_documents({})
    return {
        "progress": progress_docs,
        "modules_completed": modules_completed,
        "total_watched_seconds": total_watched_seconds,
        "total_modules": total_modules,
        "course_progress_pct": round((modules_completed / total_modules) * 100) if total_modules else 0,
    }


async def _create_snapshot(user_id: str, reason: str, note: str = "") -> Optional[dict]:
    """Create a snapshot of the user's progress. Returns the snapshot doc or None.

    Reasons: 'login', 'quiz', 'module_complete', 'homework', 'pre_restore', 'manual'.
    """
    # Skip noisy login snapshots if recent one exists
    if reason == "login":
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=SNAPSHOT_LOGIN_DEBOUNCE_HOURS)).isoformat()
        recent = await db.progress_snapshots.find_one({
            "user_id": user_id,
            "reason": "login",
            "taken_at": {"$gt": cutoff},
        })
        if recent:
            return None

    payload = await _build_snapshot_payload(user_id)
    snap = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reason": reason,
        "note": note,
        "taken_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    await db.progress_snapshots.insert_one(snap)
    snap.pop("_id", None)

    # Prune to last SNAPSHOT_RETENTION snapshots
    extras = await db.progress_snapshots.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "taken_at": 1, "reason": 1},
    ).sort("taken_at", -1).skip(SNAPSHOT_RETENTION).to_list(500)
    # Keep pre_restore safety snapshots — never prune those
    to_delete = [e["id"] for e in extras if e.get("reason") != "pre_restore"]
    if to_delete:
        await db.progress_snapshots.delete_many({"id": {"$in": to_delete}})
    return snap


# ---------- Modules ----------
@api.get("/modules")
async def list_modules(user: dict = Depends(get_current_user)):
    docs = await db.modules.find({}, {"_id": 0, "slides": 0, "quiz": 0}).sort("id", 1).to_list(20)
    progress_docs = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    prog_map = {p["module_id"]: p for p in progress_docs}
    out = []
    for m in docs:
        p = prog_map.get(m["id"], {})
        total_slides = 6  # placeholder fixed count
        watched_count = len(p.get("watched_slide_ids", []))
        out.append({
            **m,
            "total_slides": total_slides,
            "watched_slides": watched_count,
            "progress_pct": round(min(100, (watched_count / total_slides) * 100)) if total_slides else 0,
            "quiz_attempted": p.get("quiz_attempted", False),
            "quiz_passed": p.get("quiz_passed", False),
            "quiz_score_pct": p.get("quiz_score_pct", 0),
            "homework_complete": p.get("homework_complete", False),
            "module_complete": p.get("module_complete", False),
            "watched_seconds": p.get("watched_seconds", 0),
        })
    return out


@api.get("/modules/{module_id}")
async def get_module(module_id: int, user: dict = Depends(get_current_user)):
    m = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    progress = await _get_progress(user["id"], module_id)
    # do not leak correct_index
    safe_quiz = [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in m.get("quiz", [])]
    return {**m, "quiz": safe_quiz, "progress": progress}


# ---------- Progress endpoints ----------
@api.post("/progress/slide")
async def progress_slide(body: SlideProgressIn, user: dict = Depends(get_current_user)):
    module = await db.modules.find_one({"id": body.module_id}, {"_id": 0, "slides": 1})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    slide_ids = [s["id"] for s in module.get("slides", [])]
    if body.slide_id not in slide_ids:
        raise HTTPException(status_code=400, detail="Invalid slide id")

    existing = await db.progress.find_one({"user_id": user["id"], "module_id": body.module_id})
    watched = set(existing.get("watched_slide_ids", []) if existing else [])
    watched.add(body.slide_id)
    new_seconds = (existing.get("watched_seconds", 0) if existing else 0) + body.seconds
    module_complete = len(watched) >= len(slide_ids)

    update = {
        "user_id": user["id"],
        "module_id": body.module_id,
        "watched_slide_ids": list(watched),
        "watched_seconds": new_seconds,
        "last_slide_id": body.slide_id,
        "module_complete": module_complete or (existing.get("module_complete", False) if existing else False),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.progress.update_one(
        {"user_id": user["id"], "module_id": body.module_id},
        {"$set": update, "$setOnInsert": {"quiz_attempted": False, "quiz_passed": False, "quiz_score_pct": 0, "homework_complete": False}},
        upsert=True,
    )
    # Snapshot when a module is freshly completed (transition to complete)
    was_complete = bool(existing.get("module_complete")) if existing else False
    if module_complete and not was_complete:
        try:
            await _create_snapshot(user["id"], reason="module_complete", note=f"Module {body.module_id} completed")
        except Exception as e:
            logging.getLogger(__name__).warning(f"Module-complete snapshot failed: {e}")
    return {"ok": True, "watched_slides": len(watched), "total_slides": len(slide_ids), "module_complete": module_complete}


@api.post("/progress/quiz")
async def progress_quiz(body: QuizSubmitIn, user: dict = Depends(get_current_user)):
    module = await db.modules.find_one({"id": body.module_id}, {"_id": 0, "quiz": 1})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    quiz = module.get("quiz", [])
    if len(body.answers) != len(quiz):
        raise HTTPException(status_code=400, detail="Answer count mismatch")

    correct = sum(1 for i, q in enumerate(quiz) if body.answers[i] == q["correct_index"])
    pct = round((correct / len(quiz)) * 100) if quiz else 0
    passed = pct >= 80

    await db.progress.update_one(
        {"user_id": user["id"], "module_id": body.module_id},
        {"$set": {
            "user_id": user["id"],
            "module_id": body.module_id,
            "quiz_attempted": True,
            "quiz_score_pct": pct,
            "quiz_passed": passed,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, "$setOnInsert": {"watched_seconds": 0, "watched_slide_ids": [], "homework_complete": False, "module_complete": False}},
        upsert=True,
    )
    try:
        await _create_snapshot(user["id"], reason="quiz", note=f"Module {body.module_id} quiz: {pct}%")
    except Exception as e:
        logging.getLogger(__name__).warning(f"Quiz snapshot failed: {e}")
    return {"ok": True, "score_pct": pct, "passed": passed, "correct": correct, "total": len(quiz)}


@api.post("/homework/{module_id}/complete")
async def complete_homework(module_id: int, user: dict = Depends(get_current_user)):
    if not await db.modules.find_one({"id": module_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Module not found")
    await db.progress.update_one(
        {"user_id": user["id"], "module_id": module_id},
        {"$set": {"homework_complete": True, "updated_at": datetime.now(timezone.utc).isoformat()},
         "$setOnInsert": {"user_id": user["id"], "module_id": module_id, "watched_seconds": 0, "watched_slide_ids": [], "quiz_attempted": False, "quiz_score_pct": 0, "quiz_passed": False, "module_complete": False}},
        upsert=True,
    )
    try:
        await _create_snapshot(user["id"], reason="homework", note=f"Module {module_id} homework complete")
    except Exception as e:
        logging.getLogger(__name__).warning(f"Homework snapshot failed: {e}")
    return {"ok": True}


# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    progress_docs = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    modules_completed = sum(1 for p in progress_docs if p.get("module_complete"))
    total_watched_seconds = sum(p.get("watched_seconds", 0) for p in progress_docs)
    final_test_pct = 0
    quiz_scores = [p.get("quiz_score_pct", 0) for p in progress_docs if p.get("quiz_attempted")]
    total_score_pct = round(sum(quiz_scores) / len(quiz_scores)) if quiz_scores else 0

    total_modules = await db.modules.count_documents({})
    course_progress_pct = round((modules_completed / total_modules) * 100) if total_modules else 0

    # MTO requires 20 hrs (72000s); cap daily session at 5h
    MTO_TOTAL = 20 * 3600
    DAILY_MAX = 5 * 3600
    remaining_today_sec = max(0, DAILY_MAX - min(total_watched_seconds, DAILY_MAX))

    # last activity (for "Continue from where you left off")
    last_activity = None
    if progress_docs:
        sorted_p = sorted(progress_docs, key=lambda p: p.get("updated_at", ""), reverse=True)
        last_activity = {
            "module_id": sorted_p[0]["module_id"],
            "slide_id": sorted_p[0].get("last_slide_id"),
            "updated_at": sorted_p[0].get("updated_at"),
        }

    return {
        "user": {"name": user["name"], "email": user["email"], "role": user["role"]},
        "course_progress_pct": course_progress_pct,
        "modules_completed": modules_completed,
        "total_modules": total_modules,
        "total_watched_seconds": total_watched_seconds,
        "mto_required_seconds": MTO_TOTAL,
        "remaining_today_seconds": remaining_today_sec,
        "daily_max_seconds": DAILY_MAX,
        "total_score_pct": total_score_pct,
        "final_test_pct": final_test_pct,
        "last_activity": last_activity,
    }


# ---------- Admin ----------
@api.get("/admin/students")
async def admin_students(_: dict = Depends(require_admin)):
    users = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    total_modules = await db.modules.count_documents({})
    out = []
    for u in users:
        progress_docs = await db.progress.find({"user_id": u["id"]}, {"_id": 0}).to_list(100)
        modules_completed = sum(1 for p in progress_docs if p.get("module_complete"))
        total_watched_seconds = sum(p.get("watched_seconds", 0) for p in progress_docs)
        out.append({
            **u,
            "modules_completed": modules_completed,
            "total_modules": total_modules,
            "watched_seconds": total_watched_seconds,
            "course_progress_pct": round((modules_completed / total_modules) * 100) if total_modules else 0,
        })
    return out


def _generate_temp_password(length: int = 10) -> str:
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@api.post("/admin/enroll")
async def admin_enroll(body: EnrollIn, _: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    temp_password = _generate_temp_password()
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(temp_password),
        "role": "student",
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # NOTE: email sending is not configured yet. The temp password is returned ONCE
    # so the admin can copy it and share with the student manually until SMTP/Resend
    # integration is added.
    return {
        "ok": True,
        "id": user_id,
        "name": body.name,
        "email": email,
        "temp_password": temp_password,
        "email_sent": False,
    }


@api.delete("/admin/students/{user_id}")
async def admin_delete_student(user_id: str, _: dict = Depends(require_admin)):
    res = await db.users.delete_one({"id": user_id, "role": "student"})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    await db.progress.delete_many({"user_id": user_id})
    await db.progress_snapshots.delete_many({"user_id": user_id})
    return {"ok": True}


@api.post("/admin/students/{user_id}/reset-password")
async def admin_reset_password(user_id: str, _: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id, "role": "student"})
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    temp_password = _generate_temp_password()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(temp_password), "must_change_password": True}},
    )
    return {"ok": True, "temp_password": temp_password, "email": user["email"], "name": user["name"]}


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_students = await db.users.count_documents({"role": "student"})
    total_progress = await db.progress.count_documents({})
    completed = await db.progress.count_documents({"module_complete": True})
    total_snapshots = await db.progress_snapshots.count_documents({})
    return {
        "total_students": total_students,
        "total_progress_records": total_progress,
        "total_modules_completed": completed,
        "total_snapshots": total_snapshots,
    }


# ---------- Admin: Progress Snapshots ----------
def _snapshot_summary(snap: dict) -> dict:
    """Lightweight summary (no full progress array) for list endpoint."""
    return {
        "id": snap.get("id"),
        "user_id": snap.get("user_id"),
        "reason": snap.get("reason"),
        "note": snap.get("note", ""),
        "taken_at": snap.get("taken_at"),
        "modules_completed": snap.get("modules_completed", 0),
        "total_modules": snap.get("total_modules", 0),
        "total_watched_seconds": snap.get("total_watched_seconds", 0),
        "course_progress_pct": snap.get("course_progress_pct", 0),
    }


@api.get("/admin/students/{user_id}/snapshots")
async def list_snapshots(user_id: str, _: dict = Depends(require_admin)):
    student = await db.users.find_one({"id": user_id, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    snaps = await db.progress_snapshots.find({"user_id": user_id}, {"_id": 0, "progress": 0}).sort("taken_at", -1).to_list(100)
    return {
        "student": {"id": student["id"], "name": student["name"], "email": student["email"]},
        "snapshots": [_snapshot_summary(s) for s in snaps],
    }


@api.post("/admin/students/{user_id}/snapshots")
async def create_manual_snapshot(user_id: str, body: SnapshotNoteIn, _: dict = Depends(require_admin)):
    student = await db.users.find_one({"id": user_id, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    snap = await _create_snapshot(user_id, reason="manual", note=body.note or "Admin manual backup")
    return {"ok": True, "snapshot": _snapshot_summary(snap) if snap else None}


@api.post("/admin/students/{user_id}/restore/{snapshot_id}")
async def restore_snapshot(user_id: str, snapshot_id: str, _: dict = Depends(require_admin)):
    student = await db.users.find_one({"id": user_id, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    snap = await db.progress_snapshots.find_one({"id": snapshot_id, "user_id": user_id}, {"_id": 0})
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Safety: create a pre_restore snapshot of the current state first
    await _create_snapshot(user_id, reason="pre_restore", note=f"Auto-backup before restoring to {snap.get('taken_at')}")

    # Overwrite current progress with snapshot progress
    await db.progress.delete_many({"user_id": user_id})
    now_iso = datetime.now(timezone.utc).isoformat()
    restored_docs = snap.get("progress", []) or []
    if restored_docs:
        # Ensure each doc has the user_id and refreshed updated_at marker
        for d in restored_docs:
            d["user_id"] = user_id
            d["updated_at"] = d.get("updated_at") or now_iso
        await db.progress.insert_many(restored_docs)

    return {
        "ok": True,
        "restored_to": snap.get("taken_at"),
        "modules_restored": len(restored_docs),
    }


@api.delete("/admin/students/{user_id}/snapshots/{snapshot_id}")
async def delete_snapshot(user_id: str, snapshot_id: str, _: dict = Depends(require_admin)):
    res = await db.progress_snapshots.delete_one({"id": snapshot_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
