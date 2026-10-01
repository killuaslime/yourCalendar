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

    /* ---- высота под клавиатуру ----
       Когда открывается клавиатура, видимая область уменьшается.
       Подгоняем чат под неё, чтобы поле ввода не уезжало вниз. */

    function fitToViewport() {
        const height = window.visualViewport
            ? window.visualViewport.height
            : window.innerHeight;

        document.documentElement.style.setProperty("--app-height", `${height}px`);

        window.scrollTo(0, 0);

        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    fitToViewport();

    window.addEventListener("resize", fitToViewport);
    window.visualViewport?.addEventListener("resize", fitToViewport);
    window.visualViewport?.addEventListener("scroll", fitToViewport);



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

        if (!text || waiting) return;

        input.value = "";

        appendMessage(addMessage(character.id, "user", text));

        requestReply(text);
    }

    /* ---- ответ персонажа (через наш сервер, а он — к Gemini) ---- */

    let waiting = false;

    function setTyping(isTyping) {
        chatStatus.textContent = isTyping ? "печатает…" : character.status;
    }

    function buildHistory() {
        return getHistory(character.id)
            .slice(-20)
            .map(message => ({
                role: message.from === "user" ? "user" : "bot",
                text: message.text
            }));
    }

    function getContext() {
        // контекст цикла и самочувствия (cycle-data.js);
        // note (текст пользователя) на сервер не отправляем
        if (typeof getAssistantContext !== "function") {
            return { tone: "neutral", summary: "" };
        }

        const context = getAssistantContext();

        return { tone: context.tone, summary: context.summary };
    }

    function showError() {
        // сообщение об ошибке показываем, но в историю не сохраняем
        appendMessage({
            from: "bot",
            text: "Не получилось ответить 😔 Попробуй ещё раз чуть позже."
        });
    }

    async function requestReply() {

        // без сервера (API_URL пустой) — тестовый ответ
        if (!API_URL) {
            if (!DEV_MODE) return;

            setTimeout(() => {
                appendMessage(
                    addMessage(character.id, "bot", "Я тебя слышу 🤍 (тестовый ответ)")
                );
                markRead(character.id);
            }, 800);

            return;
        }

        waiting = true;
        setTyping(true);

        try {
            const headers = { "Content-Type": "application/json" };

            // Telegram подписывает данные пользователя — сервер их проверяет
            if (tg?.initData) {
                headers["Authorization"] = `tma ${tg.initData}`;
            }

            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    character_id: character.id,
                    history: buildHistory(),
                    ...getContext()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            appendMessage(addMessage(character.id, "bot", data.reply));
            markRead(character.id);

        } catch (error) {
            console.error("Ошибка чата:", error);
            showError();

        } finally {
            waiting = false;
            setTyping(false);
        }
    }

    sendButton.addEventListener("click", sendMessage);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            sendMessage();
        }
    });

}
