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
        "subtitle": "Know your car — controls, fluids, tires, lights.",
        "image_url": "https://images.unsplash.com/photo-1654616111851-5394318e3279?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBiYXklMjBjbGVhbnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 130,
    },
    {
        "id": 3,
        "title": "Vehicle Handling",
        "subtitle": "Steering, braking, accelerating — smooth and safe.",
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


# ---------- Lifespan: seed admin + indexes + modules ----------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.modules.create_index("id", unique=True)
    await db.progress.create_index([("user_id", 1), ("module_id", 1)])

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
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_id, email, "student")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": body.name, "role": "student", "created_at": user_doc["created_at"], "token": access}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
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


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


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


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_students = await db.users.count_documents({"role": "student"})
    total_progress = await db.progress.count_documents({})
    completed = await db.progress.count_documents({"module_complete": True})
    return {
        "total_students": total_students,
        "total_progress_records": total_progress,
        "total_modules_completed": completed,
    }


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
