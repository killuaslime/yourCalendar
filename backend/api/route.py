from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://killuaslime.github.io"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    initData: str

@app.post("/api/auth/telegram")
async def post_auth(auth_request: AuthRequest):
    return auth_request.initData

@app.get("/api/me")
async def get_me():
    return "Текущий пользователь"

@app.get("/api/cycle")
async def get_cycle():
    return "Периоды и прогнозы"

@app.post("/api/cycle/periods")
async def post_periods():
    return "Добавить или изменить период"

@app.get("/api/symptoms")
async def get_symptoms():
    return " Получить записи"

@app.post("/api/symptoms")
async def post_symptoms():
    return "Сохранить запись"

@app.get("/api/chat/{character}")
async def get_chat():
    return " История переписки"

@app.post("/api/chat/{character}")
async def post_chat():
    return "Отправить сообщение AI"

@app.get("/api/settings")
async def get_settings():
    return "Получить настройки"

@app.patch("/api/settings")
async def patch_settings():
    return "Изменить настройки"