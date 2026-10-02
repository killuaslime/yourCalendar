/* =====================================================
   TELEGRAM
   ===================================================== */

const tg = window.Telegram?.WebApp;

if (tg) {

    tg.ready();
    tg.expand();

}


/* =====================================================
   ПОЛУЧАЕМ ПЕРСОНАЖА
   ===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const characterId =
    params.get("id");


/* =====================================================
   ЗАПУСК ЧАТА
   ===================================================== */

async function initChat() {

    /*
     * Ждём загрузки персонажей.
     */

    await charactersReady;


    /*
     * Получаем персонажа.
     */

    const character =
        await getCharacter(characterId);


    /*
     * Если персонаж не найден —
     * возвращаемся к списку.
     */

    if (!character) {

        console.error(
            "Персонаж не найден:",
            characterId
        );

        window.location.replace(
            "messages.html"
        );

        return;

    }


    /*
     * Проверяем доступ.
     */

    const canChat =
        await canChatWith(character.id);


    if (!canChat) {

        window.location.replace(
            "messages.html"
        );

        return;

    }


    startChat(character);

}


/* =====================================================
   ЗАПУСК UI ЧАТА
   ===================================================== */

async function startChat(character) {

    const chatName =
        document.getElementById(
            "chatName"
        );


    const chatStatus =
        document.getElementById(
            "chatStatus"
        );


    const chatAvatar =
        document.getElementById(
            "chatAvatar"
        );


    const avatarLink =
        document.getElementById(
            "avatarLink"
        );


    const messages =
        document.getElementById(
            "messages"
        );


    const input =
        document.getElementById(
            "message-input"
        );


    const sendButton =
        document.getElementById(
            "send-button"
        );


    /* =================================================
       HEADER
       ================================================= */

    chatName.textContent =
        character.name;


    /*
     * Статус теперь динамический.
     *
     * Не берём его из character.json.
     */

    chatStatus.textContent =
        "В сети";


    chatAvatar.src =
        character.avatar;


    chatAvatar.alt =
        character.name;


    avatarLink.href =
        `profile.html?type=character&id=${encodeURIComponent(
            character.id
        )}`;


    document.title =
        character.name;


    /* =================================================
       ЗАГРУЗКА ИСТОРИИ
       ================================================= */

    const history =
        await getHistory(character.id);


    markRead(character.id);


    history.forEach(
        message => {

            appendMessage(
                messages,
                message.from,
                message.text
            );

        }
    );


    scrollToBottom(messages);


    /* =================================================
       ОТПРАВКА
       ================================================= */

    async function sendMessage() {

        const text =
            input.value.trim();


        if (!text) {

            return;

        }


        /*
         * Очищаем поле сразу.
         */

        input.value = "";


        /*
         * Показываем сообщение пользователя.
         */

        appendMessage(
            messages,
            "user",
            text
        );


        scrollToBottom(messages);


        /*
         * Сохраняем сообщение.
         */

        await addMessage(
            character.id,
            "user",
            text
        );


        /*
         * Запрашиваем ответ.
         */

        await requestReply(
            character,
            text,
            messages
        );

    }


    sendButton.addEventListener(
        "click",
        sendMessage
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    /* =================================================
       VIEWPORT
       ================================================= */

    function fitToViewport() {

        const height =
            window.visualViewport?.height ||
            window.innerHeight;


        document.documentElement.style
            .setProperty(
                "--app-height",
                `${height}px`
            );

    }


    window.addEventListener(
        "resize",
        fitToViewport
    );


    if (window.visualViewport) {

        window.visualViewport.addEventListener(
            "resize",
            fitToViewport
        );

        window.visualViewport.addEventListener(
            "scroll",
            fitToViewport
        );

    }


    fitToViewport();

}


/* =====================================================
   ДОБАВЛЕНИЕ СООБЩЕНИЯ В UI
   ===================================================== */

function appendMessage(
    container,
    from,
    text
) {

    const message =
        document.createElement("div");


    message.classList.add(
        "message",
        from
    );


    /*
     * Используем textContent,
     * чтобы пользовательский текст
     * не мог вставить HTML.
     */

    message.textContent =
        text;


    container.appendChild(
        message
    );

}


/* =====================================================
   ПРОКРУТКА
   ===================================================== */

function scrollToBottom(
    container
) {

    if (!container) {

        return;

    }


    /*
     * Выполняем прокрутку после перерасчёта layout,
     * чтобы высота нового сообщения уже учитывалась.
     */
    requestAnimationFrame(() => {

        container.scrollTop =
            container.scrollHeight;

    });

}


/* =====================================================
   ИСТОРИЯ ДЛЯ AI
   ===================================================== */

async function buildHistory(
    characterId
) {

    const history =
        await getHistory(
            characterId
        );


    return history
        .slice(-20)
        .map(
            message => ({
                role:
                    message.from === "user"
                        ? "user"
                        : "bot",

                text:
                    message.text
            })
        );

}


/* =====================================================
   КОНТЕКСТ
   ===================================================== */

function getContext() {

    /*
     * Здесь пока оставляем
     * твою существующую систему.
     *
     * Если cycle-data.js предоставляет
     * getAssistantContext(), используем её.
     */

    if (
        typeof getAssistantContext ===
        "function"
    ) {

        return getAssistantContext();

    }


    return {};

}


/* =====================================================
   ОШИБКА
   ===================================================== */

function showError(
    container,
    text
) {

    appendMessage(
        container,
        "bot",
        text
    );


    scrollToBottom(
        container
    );

}


/* =====================================================
   ОТВЕТ AI
   ===================================================== */

async function requestReply(
    character,
    text,
    messages
) {

    /*
     * Пока API_URL не настроен —
     * используем DEV_MODE.
     */

    if (
        typeof API_URL === "undefined" ||
        !API_URL
    ) {

        if (DEV_MODE) {

            messages.lastElementChild
                ?.classList.add(
                    "waiting"
                );


            setTimeout(
                async () => {

                    const reply =
                        character.ai?.greeting ||
                        "Я пока не умею отвечать.";


                    appendMessage(
                        messages,
                        "bot",
                        reply
                    );


                    await addMessage(
                        character.id,
                        "bot",
                        reply
                    );


                    scrollToBottom(
                        messages
                    );

                },
                700
            );


            return;

        }


        showError(
            messages,
            "Сервер недоступен."
        );

        return;

    }


    /*
     * Показываем динамический статус.
     */

    const chatStatus =
        document.getElementById(
            "chatStatus"
        );


    if (chatStatus) {

        chatStatus.textContent =
            "печатает...";

    }


    try {

        const history =
            await buildHistory(
                character.id
            );


        const context =
            getContext();


        /*
         * Получаем JWT из localStorage.
         *
         * Название ключа здесь должно
         * совпадать с тем, которое
         * использует твой auth-код.
         */

        const token = sessionStorage.getItem("yourCalendarAccessToken");


        const headers = {

            "Content-Type":
                "application/json"

        };


        if (token) {

            headers.Authorization =
                `Bearer ${token}`;

        }


        const response =
            await fetch(
                `${API_URL}/api/chat/${encodeURIComponent(
                    character.id
                )}`,
                {
                    method: "POST",

                    headers,

                    body:
                        JSON.stringify({
                            message: text,
                            history,
                            ...context
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        /*
         * Наш backend сейчас возвращает
         * поле message.
         */

        const reply =
            data.reply ??
            data.message;


        if (!reply) {

            throw new Error(
                "Сервер не вернул ответ"
            );

        }


        appendMessage(
            messages,
            "bot",
            reply
        );


        await addMessage(
            character.id,
            "bot",
            reply
        );


        scrollToBottom(
            messages
        );


    } catch (error) {

        console.error(
            "Ошибка отправки сообщения:",
            error
        );


        showError(
            messages,
            "Не удалось получить ответ. Попробуй ещё раз."
        );


    } finally {

        /*
         * Возвращаем обычный статус.
         */

        if (chatStatus) {

            chatStatus.textContent =
                "В сети";

        }

    }

}


/* =====================================================
   ЗАПУСК
   ===================================================== */

initChat();