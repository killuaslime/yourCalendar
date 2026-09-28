import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message


TOKEN = "8723956914:AAEOJReVelFIZLrwFwHWOLTnk1sMFGCpnGk"


dp = Dispatcher()


@dp.message(CommandStart())
async def start_handler(message: Message):
    await message.answer("Привет!")


async def main():
    bot = Bot(TOKEN)

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())