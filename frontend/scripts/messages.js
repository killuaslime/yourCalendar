/* =========================================================
   messages.js — список персонажей
   Нужен characters.js (подключить ДО этого файла)
   ========================================================= */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const contactList = document.getElementById("contactList");

const paywallOverlay = document.getElementById("paywallOverlay");
const paywallAvatar = document.getElementById("paywallAvatar");
const paywallTitle = document.getElementById("paywallTitle");
const paywallClose = document.getElementById("paywallClose");
const paywallLater = document.getElementById("paywallLater");
const paywallBuy = document.getElementById("paywallBuy");

// персонаж, на которого нажали, пока не было подписки
let pendingCharacter = null;


/* =========================================================
   СПИСОК
   ========================================================= */

function buildRow(character) {
    const open = canChatWith(character.id);

    let previewText;
    let ts;
    let unread;

    if (open) {

        const history = getHistory(character.id);
        const last = history[history.length - 1];

        previewText = (last.from === "user" ? "Ты: " : "") + last.text;
        ts = last.ts;
        unread = getUnreadCount(character.id);

    } else {

        // Закрытый чат: видно, что персонаж написал, но текст размыт
        previewText = character.intro[character.intro.length - 1];
        ts = getTeaserTs(character.id, character.teaserMinutesAgo);
        unread = 1;

    }

    const row = document.createElement("div");
    row.className = "contact-row";
    row.dataset.ts = ts;

    row.appendChild(createAvatar(character, "contact-avatar"));

    const body = document.createElement("div");
    body.className = "contact-body";

    /* верх: имя + время */

    const top = document.createElement("div");
    top.className = "contact-top";

    const name = document.createElement("span");
    name.className = "contact-name";
    name.textContent = character.name;

    const time = document.createElement("span");
    time.className = "contact-time";
    time.textContent = formatListTime(ts);

    top.append(name, time);

    /* низ: превью + счётчик */

    const bottom = document.createElement("div");
    bottom.className = "contact-bottom";

    const previewWrap = document.createElement("div");
    previewWrap.className = "contact-preview-wrap";

    if (!open) {
        const lock = document.createElement("span");
        lock.className = "contact-lock";
        lock.textContent = "🔒";
        previewWrap.appendChild(lock);
    }

    const preview = document.createElement("span");
    preview.className = "contact-preview";
    preview.textContent = previewText;

    if (!open) preview.classList.add("locked");

    previewWrap.appendChild(preview);
    bottom.appendChild(previewWrap);

    if (unread > 0) {
        const badge = document.createElement("span");
        badge.className = "contact-badge";
        badge.textContent = unread;
        bottom.appendChild(badge);
    }

    body.append(top, bottom);
    row.appendChild(body);

    row.addEventListener("click", () => {
        if (canChatWith(character.id)) {
            openChat(character.id);
        } else {
            openPaywall(character);
        }
    });

    return row;
}

function renderContacts() {
    contactList.innerHTML = "";

    const rows = CHARACTERS.map(buildRow);

    // новые сверху, как в Телеграме
    rows.sort((a, b) => Number(b.dataset.ts) - Number(a.dataset.ts));

    rows.forEach(row => contactList.appendChild(row));
}

function openChat(id) {
    window.location.href = `chat.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   ОКНО ПОДПИСКИ
   ========================================================= */

function openPaywall(character) {
    pendingCharacter = character;

    paywallAvatar.innerHTML = "";
    paywallAvatar.appendChild(createAvatar(character, "contact-avatar"));

    paywallTitle.textContent = `${character.name} написала тебе`;

    paywallOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closePaywall() {
    paywallOverlay.classList.remove("open");
    document.body.style.overflow = "";
}

function buy() {
    if (DEV_MODE) {
        // Тестовый режим: подписка включается сразу.
        setPremium(true);
        closePaywall();

        if (pendingCharacter) {
            openChat(pendingCharacter.id);
        } else {
            renderContacts();
        }

        return;
    }

    /*
     * TODO (боевой режим):
     * 1. POST /api/subscription/invoice → сервер создаёт счёт
     * 2. tg.openInvoice(invoiceUrl, status => { ... })
     * 3. подписку подтверждает СЕРВЕР (через webhook бота),
     *    а не браузер
     */
    if (tg?.showAlert) {
        tg.showAlert("Оплата скоро появится");
    } else {
        alert("Оплата скоро появится");
    }
}

paywallBuy.addEventListener("click", buy);
paywallClose.addEventListener("click", closePaywall);
paywallLater.addEventListener("click", closePaywall);

paywallOverlay.addEventListener("click", event => {
    if (event.target === paywallOverlay) closePaywall();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePaywall();
});


/* =========================================================
   ПЕРЕХОДЫ И ОБНОВЛЕНИЕ
   ========================================================= */

document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (event) {
        event.preventDefault();

        const destination = this.href;

        document.body.classList.add("page-exit");

        setTimeout(() => {
            window.location.href = destination;
        }, 300);
    });
});

// возврат из чата (в том числе из кэша браузера) — обновляем список
window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-exit");
    renderContacts();
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderContacts();
});

renderContacts();
