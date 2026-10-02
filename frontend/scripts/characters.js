/* =========================================================
   characters.js

   Персонажи, подписка и история чатов.

   Персонажи загружаются из:
       characters/characters.json

   А данные каждого персонажа:
       characters/<universe>/<character_id>/character.json

   Пример:
       characters/attack_on_titan/levi_ackerman/character.json

   Подключается на:
       messages.html
       chat.html
       profile.html
   ========================================================= */


/* =========================================================
   DEV MODE
   ========================================================= */

const DEV_MODE = true;


/* =========================================================
   LOCAL STORAGE KEYS
   ========================================================= */

const PREMIUM_KEY = "yourCalendarPremium";
const FREE_CHARACTER_KEY = "yourCalendarFreeCharacter";

const CHAT_PREFIX = "yourCalendarChat_";
const READ_PREFIX = "yourCalendarRead_";

const TEASER_KEY = "yourCalendarTeasers";

const HISTORY_LIMIT = 200;


/* =========================================================
   ПЕРСОНАЖИ
   ========================================================= */

/*
 * Здесь больше НЕТ захардкоженных персонажей.
 *
 * Они будут загружены из:
 *
 * characters/characters.json
 *
 * После загрузки:
 *
 * CHARACTERS = [
 *     {
 *         id: "levi_ackerman",
 *         name: "Леви Аккерман",
 *         ...
 *     }
 * ]
 */

let CHARACTERS = [];


/*
 * Флаг показывает, завершилась ли загрузка персонажей.
 */

let charactersLoaded = false;


/*
 * Promise загрузки.
 *
 * Другие файлы смогут сделать:
 *
 * await charactersReady;
 *
 * и дождаться загрузки персонажей.
 */

let charactersReady;


/* =========================================================
   ЗАГРУЗКА ПЕРСОНАЖЕЙ
   ========================================================= */

async function loadCharacters() {

    try {

        /*
         * Сначала загружаем индекс:
         *
         * characters/characters.json
         */

        const indexResponse =
            await fetch("characters/characters.json");


        if (!indexResponse.ok) {

            throw new Error(
                `Не удалось загрузить characters.json: ${indexResponse.status}`
            );

        }


        const indexData =
            await indexResponse.json();


        /*
         * Проверяем структуру.
         */

        if (
            !indexData ||
            !Array.isArray(indexData.characters)
        ) {

            throw new Error(
                "characters.json имеет неправильную структуру"
            );

        }


        /*
         * Загружаем character.json каждого персонажа.
         */

        const characterPromises =
            indexData.characters.map(
                async (characterPath) => {

                    /*
                     * Например:
                     *
                     * attack_on_titan/levi_ackerman
                     *
                     * превращается в:
                     *
                     * characters/attack_on_titan/
                     * levi_ackerman/character.json
                     */

                    const response =
                        await fetch(
                            `characters/${characterPath}/character.json`
                        );


                    if (!response.ok) {

                        throw new Error(
                            `Не удалось загрузить персонажа: ${characterPath}`
                        );

                    }


                    const character =
                        await response.json();


                    /*
                     * Сохраняем путь к папке персонажа.
                     *
                     * Это пригодится для аватарок.
                     */

                    character.path =
                        characterPath;


                    /*
                     * Если avatar указан:
                     *
                     * "01.png"
                     *
                     * превращаем его в:
                     *
                     * characters/attack_on_titan/
                     * levi_ackerman/avatars/01.png
                     */

                    if (character.avatar) {

                        character.avatar =
                            `characters/${characterPath}/avatars/${character.avatar}`;

                    }


                    /*
                     * То же самое делаем со всеми аватарками.
                     */

                    if (
                        Array.isArray(character.avatars)
                    ) {

                        character.avatars =
                            character.avatars.map(
                                avatar =>
                                    `characters/${characterPath}/avatars/${avatar}`
                            );

                    } else {

                        character.avatars = [];

                    }


                    /*
                     * Если avatar отсутствует,
                     * используем первую аватарку.
                     */

                    if (
                        !character.avatar &&
                        character.avatars.length > 0
                    ) {

                        character.avatar =
                            character.avatars[0];

                    }


                    return character;

                }
            );


        /*
         * Ждём загрузки всех персонажей.
         */

        CHARACTERS =
            await Promise.all(characterPromises);


        charactersLoaded = true;


        console.log(
            `Загружено персонажей: ${CHARACTERS.length}`
        );


        return CHARACTERS;

    } catch (error) {

        console.error(
            "Ошибка загрузки персонажей:",
            error
        );


        CHARACTERS = [];

        charactersLoaded = false;


        throw error;

    }

}


/*
 * Запускаем загрузку сразу после подключения файла.
 */

charactersReady = loadCharacters();


/* =========================================================
   GET CHARACTER
   ========================================================= */

/*
 * ВАЖНО:
 *
 * Теперь функция асинхронная.
 *
 * Использование:
 *
 * const character = await getCharacter("levi_ackerman");
 */

async function getCharacter(id) {

    await charactersReady;

    return (
        CHARACTERS.find(
            character => character.id === id
        ) || null
    );

}


/* =========================================================
   БЕЗОПАСНАЯ РАБОТА С LOCALSTORAGE
   ========================================================= */

function readJSON(key, fallback) {

    try {

        const value =
            JSON.parse(
                localStorage.getItem(key)
            );


        return (
            value === null ||
            value === undefined
        )
            ? fallback
            : value;

    } catch (error) {

        return fallback;

    }

}


function writeJSON(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.error(
            "Не удалось сохранить:",
            error
        );

    }

}


/* =========================================================
   ПОДПИСКА
   ========================================================= */

/*
 * ВАЖНО:
 *
 * Это пока только клиентская заглушка.
 *
 * Настоящая подписка должна проверяться
 * на сервере.
 */

function isPremium() {

    return (
        localStorage.getItem(PREMIUM_KEY) === "1"
    );

}


function setPremium(value) {

    try {

        if (value) {

            localStorage.setItem(
                PREMIUM_KEY,
                "1"
            );

        } else {

            localStorage.removeItem(
                PREMIUM_KEY
            );

        }

    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   БЕСПЛАТНЫЙ ПЕРСОНАЖ
   ========================================================= */

/*
 * Возвращает ID бесплатного персонажа.
 *
 * Пока пользователь может выбрать его,
 * но если сохранённого персонажа нет —
 * используется первый персонаж из characters.json.
 */

async function getFreeCharacterId() {

    await charactersReady;


    const saved =
        localStorage.getItem(
            FREE_CHARACTER_KEY
        );


    if (
        saved &&
        CHARACTERS.some(
            character => character.id === saved
        )
    ) {

        return saved;

    }


    return CHARACTERS.length > 0
        ? CHARACTERS[0].id
        : null;

}


/* =========================================================
   ПРОВЕРКА ДОСТУПА К ЧАТУ
   ========================================================= */

async function canChatWith(id) {

    if (isPremium()) {

        return true;

    }


    const freeCharacterId =
        await getFreeCharacterId();


    return id === freeCharacterId;

}


/* =========================================================
   ВРЕМЯ
   ========================================================= */

function charDateKey() {

    const now = new Date();


    const m =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const d =
        String(
            now.getDate()
        ).padStart(2, "0");


    return (
        `${now.getFullYear()}-${m}-${d}`
    );

}


/*
 * Как в Telegram:
 *
 * сегодня → 21:02
 * за неделю → пт
 * раньше → дата
 */

function formatListTime(ts) {

    const date =
        new Date(ts);


    const now =
        new Date();


    const startOfToday =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        ).getTime();


    if (ts >= startOfToday) {

        return date.toLocaleTimeString(
            "ru-RU",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    if (
        ts >=
        startOfToday - 6 * 86400000
    ) {

        return date.toLocaleDateString(
            "ru-RU",
            {
                weekday: "short"
            }
        );

    }


    return date.toLocaleDateString(
        "ru-RU"
    );

}


/* =========================================================
   ВРЕМЯ ПЕРВОГО СООБЩЕНИЯ ПЕРСОНАЖА
   ========================================================= */

/*
 * Фиксируется на день,
 * чтобы при каждом открытии списка
 * время не менялось.
 *
 * Для нового character.json
 * teaserMinutesAgo больше нет.
 *
 * Поэтому используем стандартное значение.
 */

function getTeaserTs(
    id,
    minutesAgo = 10
) {

    let data =
        readJSON(
            TEASER_KEY,
            null
        );


    if (
        !data ||
        data.date !== charDateKey()
    ) {

        data = {
            date: charDateKey(),
            ts: {}
        };

    }


    if (!data.ts[id]) {

        data.ts[id] =
            Date.now() -
            minutesAgo * 60000;


        writeJSON(
            TEASER_KEY,
            data
        );

    }


    return data.ts[id];

}


/* =========================================================
   ИСТОРИЯ ЧАТОВ
   ========================================================= */

/*
 * message:
 *
 * {
 *     from: "bot" | "user",
 *     text: "...",
 *     ts: 1700000000000
 * }
 */

async function getHistory(id) {

    let history =
        readJSON(
            CHAT_PREFIX + id,
            null
        );


    if (!Array.isArray(history)) {

        const character =
            await getCharacter(id);


        /*
         * Если персонаж не найден,
         * возвращаем пустую историю.
         */

        if (!character) {

            return [];

        }


        const base =
            getTeaserTs(id);


        /*
         * Теперь приветствие берём
         * из character.json:
         *
         * ai.greeting
         */

        const greeting =
            character.ai?.greeting;


        if (
            greeting &&
            typeof greeting === "string"
        ) {

            history = [
                {
                    from: "bot",
                    text: greeting,
                    ts: base
                }
            ];

        } else {

            history = [];

        }


        writeJSON(
            CHAT_PREFIX + id,
            history
        );

    }


    return history;

}


/* =========================================================
   ДОБАВЛЕНИЕ СООБЩЕНИЯ
   ========================================================= */

async function addMessage(
    id,
    from,
    text
) {

    const history =
        await getHistory(id);


    const message = {

        from,

        text,

        ts: Date.now()

    };


    history.push(message);


    writeJSON(
        CHAT_PREFIX + id,
        history.slice(-HISTORY_LIMIT)
    );


    return message;

}


/* =========================================================
   ПРОЧИТАНО
   ========================================================= */

function markRead(id) {

    writeJSON(
        READ_PREFIX + id,
        Date.now()
    );

}


/* =========================================================
   НЕПРОЧИТАННЫЕ
   ========================================================= */

async function getUnreadCount(id) {

    const readTs =
        readJSON(
            READ_PREFIX + id,
            0
        );


    const history =
        await getHistory(id);


    return history.filter(
        message =>
            message.from === "bot" &&
            message.ts > readTs
    ).length;

}


/* =========================================================
   АВАТАР
   ========================================================= */

/*
 * Создаёт <img> для персонажа.
 *
 * Если изображение не загрузилось,
 * показывает первую букву имени.
 */

function createAvatar(
    character,
    className
) {

    const img =
        document.createElement("img");


    img.className =
        className;


    img.alt =
        character.name;


    img.src =
        character.avatar;


    img.addEventListener(
        "error",
        () => {

            const fallback =
                document.createElement("div");


            fallback.className =
                `${className} avatar-fallback`;


            fallback.textContent =
                character.name.charAt(0);


            img.replaceWith(
                fallback
            );

        }
    );


    return img;

}