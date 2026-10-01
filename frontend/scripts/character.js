/* =========================================================
   characters.js
   Персонажи, подписка и история чатов.
   Подключается на messages.html, chat.html и profile.html.
   Сейчас всё лежит в localStorage. Позже эти функции заменятся
   запросами к FastAPI, а остальной код менять не придётся.
   ========================================================= */

/*
 * DEV_MODE = true:
 *   - кнопка "Оформить подписку" просто включает подписку (для теста)
 *   - персонаж отвечает тестовой фразой
 * Перед релизом поставить false.
 */
const DEV_MODE = true;

const PREMIUM_KEY = "yourCalendarPremium";
const FREE_CHARACTER_KEY = "yourCalendarFreeCharacter";
const CHAT_PREFIX = "yourCalendarChat_";
const READ_PREFIX = "yourCalendarRead_";
const TEASER_KEY = "yourCalendarTeasers";
const HISTORY_LIMIT = 200;


/* =========================================================
   ПЕРСОНАЖИ
   Имена и тексты ниже — заглушки, замени на свои.
   avatars: положи картинки в avatars/<id>/avatar1.png.
   Если картинки нет, покажется кружок с первой буквой.
   intro: первые сообщения персонажа. Для закрытых чатов
   последнее из них видно в списке размытым.
   teaserMinutesAgo: "сколько минут назад написал" (для списка).
   ========================================================= */

const CHARACTERS = [
    {
        id: "luna",
        name: "Луна",
        username: "@luna_calendar",
        status: "Была недавно",
        avatars: [
            "avatars/luna/avatar1.png",
            "avatars/luna/avatar2.png",
            "avatars/luna/avatar3.png",
            "avatars/luna/avatar4.png"
        ],
        intro: ["Привет ❤️", "Как ты сегодня?"],
        teaserMinutesAgo: 12
    },
    {
        id: "mia",
        name: "Мия",
        username: "@mia_calendar",
        status: "Была вчера",
        avatars: ["avatars/mia/avatar1.png"],
        intro: ["Привет! Как ты? 🌸"],
        teaserMinutesAgo: 47
    },
    {
        id: "sonya",
        name: "Соня",
        username: "@sonya_calendar",
        status: "Была недавно",
        avatars: ["avatars/sonya/avatar1.png"],
        intro: ["Привет, как дела?"],
        teaserMinutesAgo: 130
    },
    {
        id: "alisa",
        name: "Алиса",
        username: "@alisa_calendar",
        status: "Была в сети давно",
        avatars: ["avatars/alisa/avatar1.png"],
        intro: ["Привет! Как настроение? ✨"],
        teaserMinutesAgo: 260
    }
];

CHARACTERS.forEach(character => {
    character.avatar = character.avatars[0];
});

function getCharacter(id) {
    return CHARACTERS.find(character => character.id === id) || null;
}


/* =========================================================
   БЕЗОПАСНАЯ РАБОТА С localStorage
   ========================================================= */

function readJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null || value === undefined ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("Не удалось сохранить:", error);
    }
}


/* =========================================================
   ПОДПИСКА
   ВАЖНО: это только для интерфейса. Настоящий статус подписки
   должен храниться и проверяться на сервере, иначе его можно
   включить из консоли браузера.
   ========================================================= */

function isPremium() {
    return localStorage.getItem(PREMIUM_KEY) === "1";
}

function setPremium(value) {
    try {
        if (value) localStorage.setItem(PREMIUM_KEY, "1");
        else localStorage.removeItem(PREMIUM_KEY);
    } catch (error) {
        console.error(error);
    }
}

// Бесплатный персонаж (пока всегда первый; позже пользователь сможет выбирать).
function getFreeCharacterId() {
    const saved = localStorage.getItem(FREE_CHARACTER_KEY);
    return getCharacter(saved) ? saved : CHARACTERS[0].id;
}

function canChatWith(id) {
    return isPremium() || id === getFreeCharacterId();
}


/* =========================================================
   ВРЕМЯ
   ========================================================= */

function charDateKey() {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${m}-${d}`;
}

// Как в Телеграме: сегодня → 21:02, за неделю → "пт", раньше → дата
function formatListTime(ts) {
    const date = new Date(ts);
    const now = new Date();

    const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    ).getTime();

    if (ts >= startOfToday) {
        return date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    if (ts >= startOfToday - 6 * 86400000) {
        return date.toLocaleDateString("ru-RU", { weekday: "short" });
    }

    return date.toLocaleDateString("ru-RU");
}

// Время "первого сообщения" персонажа. Фиксируется на день,
// чтобы при каждом открытии списка оно не менялось.
function getTeaserTs(id, minutesAgo) {
    let data = readJSON(TEASER_KEY, null);

    if (!data || data.date !== charDateKey()) {
        data = { date: charDateKey(), ts: {} };
    }

    if (!data.ts[id]) {
        data.ts[id] = Date.now() - minutesAgo * 60000;
        writeJSON(TEASER_KEY, data);
    }

    return data.ts[id];
}


/* =========================================================
   ИСТОРИЯ ЧАТОВ
   message = { from: "bot" | "user", text: "...", ts: 1700000000000 }
   ========================================================= */

function getHistory(id) {
    let history = readJSON(CHAT_PREFIX + id, null);

    if (!Array.isArray(history)) {
        const character = getCharacter(id);
        const base = getTeaserTs(id, character.teaserMinutesAgo);

        history = character.intro.map((text, index) => ({
            from: "bot",
            text,
            ts: base + index * 1000
        }));

        writeJSON(CHAT_PREFIX + id, history);
    }

    return history;
}

function addMessage(id, from, text) {
    const history = getHistory(id);

    const message = { from, text, ts: Date.now() };

    history.push(message);

    writeJSON(CHAT_PREFIX + id, history.slice(-HISTORY_LIMIT));

    return message;
}

function markRead(id) {
    writeJSON(READ_PREFIX + id, Date.now());
}

function getUnreadCount(id) {
    const readTs = readJSON(READ_PREFIX + id, 0);

    return getHistory(id).filter(
        message => message.from === "bot" && message.ts > readTs
    ).length;
}


/* =========================================================
   АВАТАР (с запасным кружком, если картинки нет)
   ========================================================= */

function createAvatar(character, className) {
    const img = document.createElement("img");

    img.className = className;
    img.alt = character.name;
    img.src = character.avatar;

    img.addEventListener("error", () => {
        const fallback = document.createElement("div");

        fallback.className = `${className} avatar-fallback`;
        fallback.textContent = character.name.charAt(0);

        img.replaceWith(fallback);
    });

    return img;
}