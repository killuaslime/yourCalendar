/* =========================================================
   chat.js — переписка с персонажем
   Нужен characters.js (подключить ДО этого файла)
   ========================================================= */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const params = new URLSearchParams(window.location.search);

const character =
    getCharacter(params.get("id")) ||
    getCharacter(getFreeCharacterId());


/*
 * Защита: в чат без подписки попасть нельзя.
 * (Это только интерфейс. Настоящую проверку должен делать
 * сервер при каждом запросе к ИИ.)
 */

if (!canChatWith(character.id)) {

    window.location.replace("messages.html");

} else {

    startChat();

}


function startChat() {

    const chatName = document.getElementById("chatName");
    const chatStatus = document.getElementById("chatStatus");
    const chatAvatar = document.getElementById("chatAvatar");
    const avatarLink = document.getElementById("avatarLink");
    const messagesBox = document.getElementById("messages");
    const input = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");


    /* ---- шапка ---- */

    chatName.textContent = character.name;
    chatStatus.textContent = character.status;

    chatAvatar.src = character.avatar;
    chatAvatar.alt = character.name;

    avatarLink.href =
        `profile.html?type=character&id=${encodeURIComponent(character.id)}`;

    document.title = character.name;


    /* ---- сообщения ---- */

    function appendMessage(message) {
        const element = document.createElement("div");

        element.className =
            "message " +
            (message.from === "user" ? "user-message" : "bot-message");

        // textContent, а не innerHTML: текст пользователя нельзя вставлять как HTML
        element.textContent = message.text;

        messagesBox.appendChild(element);

        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    getHistory(character.id).forEach(appendMessage);

    markRead(character.id);


    /* ---- отправка ---- */

    function sendMessage() {
        const text = input.value.trim();

        if (!text) return;

        input.value = "";

        appendMessage(addMessage(character.id, "user", text));

        requestReply(text);
    }

    /*
     * TODO: здесь будет запрос к бэкенду:
     *   POST /api/chat  { character_id, text }
     * Сервер сам соберёт контекст (цикл, самочувствие, тон),
     * вызовет AI API и вернёт ответ.
     */
    function requestReply(userText) {
        if (!DEV_MODE) return;

        setTimeout(() => {
            appendMessage(
                addMessage(character.id, "bot", "Я тебя слышу 🤍 (тестовый ответ)")
            );

            markRead(character.id);
        }, 800);
    }

    sendButton.addEventListener("click", sendMessage);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            sendMessage();
        }
    });


    /* ---- переходы назад ---- */

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

    window.addEventListener("pageshow", () => {
        document.body.classList.remove("page-exit");
    });
}
