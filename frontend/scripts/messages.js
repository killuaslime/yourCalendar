/* =========================================================
   messages.js — список персонажей
   Требует:
   - characters.js подключён ДО этого файла
   ========================================================= */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


/* =========================================================
   DOM
   ========================================================= */

const contactList = document.getElementById("contactList");

const paywallOverlay = document.getElementById("paywallOverlay");
const paywallAvatar = document.getElementById("paywallAvatar");
const paywallTitle = document.getElementById("paywallTitle");
const paywallClose = document.getElementById("paywallClose");
const paywallLater = document.getElementById("paywallLater");
const paywallBuy = document.getElementById("paywallBuy");

let pendingCharacter = null;


/* =========================================================
   ПОСТРОЕНИЕ СТРОКИ ПЕРСОНАЖА
   ========================================================= */

async function buildRow(character) {

    const open = await canChatWith(character.id);

    let previewText = "";
    let ts = Date.now();
    let unread = 0;


    /* =====================================================
       ОТКРЫТЫЙ ЧАТ
       ===================================================== */

    if (open) {

        const history = await getHistory(character.id);

        /*
         * История может быть пустой.
         * Поэтому обязательно проверяем last.
         */

        const last = history?.[history.length - 1];

        if (last) {

            previewText =
                (last.from === "user" ? "Ты: " : "") +
                (last.text || "");

            ts = last.ts || Date.now();

        } else {

            previewText =
                character.ai?.greeting ||
                "Начать разговор";

            ts = Date.now();
        }


        unread = await getUnreadCount(character.id);

    }


    /* =====================================================
       ЗАКРЫТЫЙ ЧАТ
       ===================================================== */

    else {

        previewText =
            character.ai?.greeting ||
            "Новое сообщение";

        ts = getTeaserTs(character.id, 10);

        unread = 1;
    }


    /* =====================================================
       ROW
       ===================================================== */

    const row = document.createElement("div");

    row.className = "contact-row";

    row.dataset.characterId = character.id;
    row.dataset.ts = String(ts);


    /* =====================================================
       AVATAR
       ===================================================== */

    row.appendChild(
        createAvatar(
            character,
            "contact-avatar"
        )
    );


    /* =====================================================
       BODY
       ===================================================== */

    const body = document.createElement("div");

    body.className = "contact-body";


    /* =====================================================
       TOP
       ===================================================== */

    const top = document.createElement("div");

    top.className = "contact-top";


    const name = document.createElement("span");

    name.className = "contact-name";

    name.textContent =
        character.name || "Персонаж";


    const time = document.createElement("span");

    time.className = "contact-time";

    time.textContent =
        formatListTime(ts);


    top.append(
        name,
        time
    );


    /* =====================================================
       BOTTOM
       ===================================================== */

    const bottom = document.createElement("div");

    bottom.className = "contact-bottom";


    /* =====================================================
       PREVIEW
       ===================================================== */

    const previewWrap =
        document.createElement("div");

    previewWrap.className =
        "contact-preview-wrap";


    /* =====================================================
       LOCK
       ===================================================== */

    if (!open) {

        const lock =
            document.createElement("span");

        lock.className =
            "contact-lock";

        lock.textContent = "🔒";

        previewWrap.appendChild(lock);
    }


    /* =====================================================
       TEXT
       ===================================================== */

    const preview =
        document.createElement("span");

    preview.className =
        "contact-preview";

    preview.textContent =
        previewText;


    if (!open) {

        preview.classList.add("locked");
    }


    previewWrap.appendChild(preview);

    bottom.appendChild(previewWrap);


    /* =====================================================
       UNREAD
       ===================================================== */

    if (unread > 0) {

        const badge =
            document.createElement("span");

        badge.className =
            "contact-badge";

        badge.textContent =
            unread > 99 ? "99+" : unread;

        bottom.appendChild(badge);
    }


    /* =====================================================
       ASSEMBLE
       ===================================================== */

    body.append(
        top,
        bottom
    );

    row.appendChild(body);


    /* =====================================================
       CLICK
       ===================================================== */

    row.addEventListener(
        "click",
        async () => {

            const allowed =
                await canChatWith(character.id);


            if (allowed) {

                openChat(character.id);

            } else {

                openPaywall(character);
            }
        }
    );


    return row;
}


/* =========================================================
   ПРЕДСТАВИТЕЛИ ВСЕЛЕННЫХ
   ========================================================= */

/*
 * Показываем только одного персонажа из каждой вселенной.
 * Первый персонаж в characters.json становится представителем,
 * поэтому выбор остаётся стабильным и предсказуемым.
 */
function getUniverseRepresentatives() {

    const seenUniverses = new Set();


    return CHARACTERS.filter(
        character => {

            const universe =
                character.universe ||
                "unknown";


            if (seenUniverses.has(universe)) {

                return false;

            }


            seenUniverses.add(universe);

            return true;

        }
    );

}


/* =========================================================
   РЕНДЕР СПИСКА
   ========================================================= */

let contactsRenderInProgress = false;


async function renderContacts() {

    /*
     * pageshow и первоначальный запуск могут произойти почти одновременно.
     * Не допускаем два асинхронных рендера одного списка.
     */
    if (contactsRenderInProgress) {

        return;

    }


    contactsRenderInProgress = true;


    try {

        console.log(
        "renderContacts: начало"
    );


    /* =====================================================
       ЖДЁМ ЗАГРУЗКУ ПЕРСОНАЖЕЙ
       ===================================================== */

    await charactersReady;


    console.log(
        "renderContacts: персонажи загружены",
        CHARACTERS.length
    );


    /* =====================================================
       ПРОВЕРКА DOM
       ===================================================== */

    if (!contactList) {

        console.error(
            "renderContacts: #contactList не найден"
        );

        return;
    }


    /* =====================================================
       СОЗДАНИЕ ROW
       ===================================================== */

    const rows = [];
    const representatives =
        getUniverseRepresentatives();


    for (const character of representatives) {

        try {

            const row =
                await buildRow(character);

            rows.push(row);

        } catch (error) {

            console.error(
                `Ошибка персонажа ${character.id}:`,
                error
            );
        }
    }


    /* =====================================================
       СОРТИРОВКА
       ===================================================== */

    rows.sort(
        (a, b) => {

            return (
                (Number(b.dataset.ts) || 0) -
                (Number(a.dataset.ts) || 0)
            );
        }
    );


    /* =====================================================
       ДОБАВЛЕНИЕ В DOM
       ===================================================== */

    /*
     * Заменяем содержимое только после полной сборки и сортировки.
     * Это не оставляет старые строки при повторном обновлении.
     */
    contactList.replaceChildren(...rows);


        console.log(
            "renderContacts: готово",
            rows.length
        );

    } finally {

        contactsRenderInProgress = false;

    }
}


/* =========================================================
   ОТКРЫТЬ ЧАТ
   ========================================================= */

function openChat(id) {

    window.location.href =
        `chat.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   PAYWALL
   ========================================================= */

function openPaywall(character) {

    pendingCharacter = character;


    /* Очистить старый avatar */

    paywallAvatar.innerHTML = "";


    /* Новый avatar */

    paywallAvatar.appendChild(
        createAvatar(
            character,
            "contact-avatar"
        )
    );


    /* Заголовок */

    paywallTitle.textContent =
        `${character.name} написала тебе`;


    /* Показать */

    paywallOverlay.classList.add("open");

    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   ЗАКРЫТЬ PAYWALL
   ========================================================= */

function closePaywall() {

    paywallOverlay.classList.remove(
        "open"
    );

    document.body.style.overflow = "";
}


/* =========================================================
   ПОКУПКА
   ========================================================= */

function buy() {

    if (DEV_MODE) {

        /*
         * Тестовый режим.
         * Открываем премиум всем.
         */

        setPremium(true);

        closePaywall();


        if (pendingCharacter) {

            openChat(
                pendingCharacter.id
            );

        } else {

            renderContacts();
        }

        return;
    }


    /*
     * TODO:
     *
     * POST /api/subscription/invoice
     *
     * Сервер создаёт Telegram Invoice.
     */


    if (tg?.showAlert) {

        tg.showAlert(
            "Оплата скоро появится"
        );

    } else {

        alert(
            "Оплата скоро появится"
        );
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

if (paywallBuy) {

    paywallBuy.addEventListener(
        "click",
        buy
    );
}


if (paywallClose) {

    paywallClose.addEventListener(
        "click",
        closePaywall
    );
}


if (paywallLater) {

    paywallLater.addEventListener(
        "click",
        closePaywall
    );
}


if (paywallOverlay) {

    paywallOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                paywallOverlay
            ) {

                closePaywall();
            }
        }
    );
}


/* =========================================================
   ESC
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closePaywall();
        }
    }
);


/* =========================================================
   ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ
   ========================================================= */

document.querySelectorAll("a").forEach(
    link => {

        link.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const destination =
                    this.href;


                document.body.classList.add(
                    "page-exit"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            destination;

                    },
                    300
                );
            }
        );
    }
);


/* =========================================================
   ВОЗВРАТ НА СТРАНИЦУ
   ========================================================= */

window.addEventListener(
    "pageshow",
    () => {

        document.body.classList.remove(
            "page-exit"
        );

        renderContacts().catch(
            error => {

                console.error(
                    "Ошибка renderContacts:",
                    error
                );
            }
        );
    }
);


/* =========================================================
   ПЕРЕКЛЮЧЕНИЕ ВКЛАДКИ
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (!document.hidden) {

            renderContacts().catch(
                error => {

                    console.error(
                        "Ошибка обновления списка:",
                        error
                    );
                }
            );
        }
    }
);


/* =========================================================
   START
   ========================================================= */

renderContacts().catch(
    error => {

        console.error(
            "Ошибка запуска списка:",
            error
        );
    }
);