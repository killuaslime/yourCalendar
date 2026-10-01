import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message

from dotenv import load_dotenv
import os
from database.database import SessionLocal, engine, Base
from database.models import User, Subscription
from sqlalchemy import select


load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")



dp = Dispatcher()


@dp.message(CommandStart())
async def start_handler(message: Message):
    async with SessionLocal() as session:

        result = await session.execute(
            select(User).where(
                User.telegram_id == message.from_user.id
            )
        )

        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                telegram_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name
            )

            session.add(user)

            await session.commit()
            await session.refresh(user)

            await message.answer("Привет! Ты зарегистрирован ❤️")

        else:
            await message.answer("С возвращением ❤️")

        result = await session.execute(
            select(Subscription).where(
                Subscription.user_id == user.id
            )
        )

        subscription = result.scalar_one_or_none()

        if subscription and subscription.status == "active":
            await message.answer(
                f"Подписка активна\nТариф: {subscription.plan}"
            )
        else:
            await message.answer("Подписка не активна")

async def main():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    print("Таблицы успешно созданы!")

    bot = Bot(TOKEN)

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
