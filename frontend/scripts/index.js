/* =========================================================
   index.js — главный экран
   Данные и расчёты лежат в cycle-data.js (подключить ДО этого файла)
   ========================================================= */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}
const tgInitData = Telegram.WebApp.initData
console.log(tgInitData)

/* =========================================================
   ЭЛЕМЕНТЫ
   ========================================================= */

const $ = id => document.getElementById(id);

const dateStrip = $("dateStrip");

const cycleNextEl = $("cycleNext");
const cycleDayEl = $("cycleDay");
const cycleLabelEl = $("cycleLabel");

const calendarButton = $("calendarButton");
const periodButton = $("periodButton");
const calendarOverlay = $("calendarOverlay");
const calendarClose = $("calendarClose");
const calendarScroll = $("calendarScroll");
const calendarModeText = $("calendarModeText");

const todayQuestion = $("todayQuestion");
const symptomsButton = $("symptomsButton");
const symptomsOverlay = $("symptomsOverlay");
const symptomsClose = $("symptomsClose");
const symptomsSave = $("symptomsSave");
const moodRow = $("moodRow");
const bodyChips = $("bodyChips");
const emotionChips = $("emotionChips");
const painRow = $("painRow");
const painHint = $("painHint");
const symptomsNote = $("symptomsNote");


/* =========================================================
   ЛЕНТА ДАТ (текущая неделя Пн–Вс)
   ========================================================= */

function renderDateStrip() {
    const names = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

    const now = new Date();
    const weekday = (now.getDay() + 6) % 7; // Пн = 0

    dateStrip.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - weekday + i
        );

        const item = document.createElement("div");
        item.className = "date";

        if (i === weekday) item.classList.add("today");

        const name = document.createElement("span");
        name.className = "weekday";
        name.textContent = names[i];

        const number = document.createElement("span");
        number.className = "number";
        number.textContent = date.getDate();

        item.append(name, number);
        dateStrip.appendChild(item);
    }
}


/* =========================================================
   КАРТОЧКА ЦИКЛА
   Сначала — сколько осталось до месячных, потом — день цикла.
   ========================================================= */

function setNext(label, value) {
    cycleNextEl.innerHTML = "";

    const labelEl = document.createElement("span");
    labelEl.className = "cycle-next-label";
    labelEl.textContent = label;
    cycleNextEl.appendChild(labelEl);

    if (value) {
        const valueEl = document.createElement("strong");
        valueEl.className = "cycle-next-value";
        valueEl.textContent = value;
        cycleNextEl.appendChild(valueEl);
    }
}

function updateCycleOnMain() {
    const today = todayKey();

    /* Ничего не отмечено */

    if (!state.last) {
        setNext("Отметь первый день месячных, и я подскажу, когда ждать следующие");
        cycleDayEl.textContent = "–";
        cycleLabelEl.textContent = "пока нет данных";
        return;
    }

    /* День цикла */

    cycleDayEl.textContent = Math.max(1, diffDays(today, state.last.start) + 1);
    cycleLabelEl.textContent = "день цикла";

    /* Сейчас идут месячные */

    if (state.periodDays.has(today)) {
        setNext("Сейчас", "идут месячные");
        return;
    }

    /* Прогноз */

    const n = state.daysUntil;

    if (n > 1) {
        setNext(
            "Месячные начнутся примерно через",
            `${n} ${plural(n, "день", "дня", "дней")}`
        );
    } else if (n === 1) {
        setNext("Месячные начнутся примерно", "завтра");
    } else if (n === 0) {
        setNext("Месячные могут начаться", "сегодня");
    } else {
        const late = Math.abs(n);

        setNext(
            "Месячные задерживаются на",
            `${late} ${plural(late, "день", "дня", "дней")}`
        );
    }
}


/* =========================================================
   КАЛЕНДАРЬ: ОФОРМЛЕНИЕ ДНЕЙ
   ========================================================= */

function paintDay(button) {
    const key = button.dataset.key;
    const isPeriod = state.periodDays.has(key);

    button.classList.toggle("today", key === todayKey());
    button.classList.toggle("period", isPeriod);
    button.classList.toggle("predicted", !isPeriod && state.predictedDays.has(key));
    button.classList.toggle("future", key > todayKey());
}

// Перекрашиваем дни на месте — календарь не перерисовывается
// и не прокручивается обратно к текущему месяцу.
function refreshCalendar() {
    calendarScroll
        .querySelectorAll(".calendar-day")
        .forEach(paintDay);
}

function setModeText(text) {
    calendarModeText.textContent = text;
}


/* =========================================================
   НАЖАТИЕ НА ДЕНЬ
   1. тап по первому дню отмеченных месячных → удалить
   2. тап через 1–9 дней после начала → это конец
   3. иначе → начало новых месячных
   ========================================================= */

function onDayTap(key) {
    if (key > todayKey()) {
        setModeText("Будущие дни отметить нельзя — я сама покажу прогноз");
        return;
    }

    const existingIndex = periods.findIndex(p => p.start === key);

    if (existingIndex !== -1) {

        periods.splice(existingIndex, 1);
        setModeText("Отметка удалена");

    } else {

        const owner = [...periods]
            .reverse()
            .find(p => p.start < key && diffDays(key, p.start) < MAX_PERIOD);

        if (owner) {

            owner.end = key;

            setModeText(
                `Месячные: ${formatDay(owner.start)} — ${formatDay(key)}`
            );

        } else {

            periods.push({ start: key, end: null });

            setModeText(
                `Начало: ${formatDay(key)}. Если они уже закончились, нажми на последний день`
            );
        }
    }

    savePeriods();
    recalculate();

    refreshCalendar();
    updateCycleOnMain();
}


/* =========================================================
   КАЛЕНДАРЬ: МЕСЯЦЫ
   ========================================================= */

function getMonthName(year, month) {
    return new Date(year, month, 1).toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric"
    });
}

function createMonth(year, month) {
    const container = document.createElement("section");

    container.className = "calendar-month";
    container.dataset.year = year;
    container.dataset.month = month;

    const title = document.createElement("div");
    title.className = "calendar-month-title";
    title.textContent = getMonthName(year, month);
    container.appendChild(title);

    const weekdays = document.createElement("div");
    weekdays.className = "calendar-weekdays";

    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(name => {
        const element = document.createElement("div");
        element.className = "calendar-weekday";
        element.textContent = name;
        weekdays.appendChild(element);
    });

    container.appendChild(weekdays);

    const grid = document.createElement("div");
    grid.className = "calendar-days";

    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

    for (let i = 0; i < firstWeekday; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-empty";
        grid.appendChild(empty);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const key = dateToKey(new Date(year, month, day));

        const button = document.createElement("button");

        button.type = "button";
        button.className = "calendar-day";
        button.textContent = day;
        button.dataset.key = key;

        paintDay(button);

        button.addEventListener("click", () => onDayTap(key));

        grid.appendChild(button);
    }

    container.appendChild(grid);

    return container;
}

function renderCalendar() {
    calendarScroll.innerHTML = "";

    const today = new Date();

    for (let offset = -12; offset <= 12; offset++) {
        const date = new Date(
            today.getFullYear(),
            today.getMonth() + offset,
            1
        );

        calendarScroll.appendChild(
            createMonth(date.getFullYear(), date.getMonth())
        );
    }

    const currentMonth = calendarScroll.querySelector(
        `[data-year="${today.getFullYear()}"][data-month="${today.getMonth()}"]`
    );

    if (currentMonth) {
        requestAnimationFrame(() => {
            calendarScroll.scrollTop = currentMonth.offsetTop - 15;
        });
    }
}


/* =========================================================
   БЕСКОНЕЧНЫЙ СКРОЛЛ
   ========================================================= */

calendarScroll.addEventListener("scroll", () => {
    if (calendarScroll.scrollTop < 400) {
        loadPreviousMonths();
    }

    const distanceToBottom =
        calendarScroll.scrollHeight -
        calendarScroll.scrollTop -
        calendarScroll.clientHeight;

    if (distanceToBottom < 400) {
        loadNextMonths();
    }
});

function loadPreviousMonths() {
    const firstMonth = calendarScroll.querySelector(".calendar-month");

    if (!firstMonth) return;

    const year = Number(firstMonth.dataset.year);
    const month = Number(firstMonth.dataset.month);

    const oldHeight = calendarScroll.scrollHeight;

    for (let i = 3; i >= 1; i--) {
        const date = new Date(year, month - i, 1);

        calendarScroll.prepend(
            createMonth(date.getFullYear(), date.getMonth())
        );
    }

    calendarScroll.scrollTop += calendarScroll.scrollHeight - oldHeight;
}

function loadNextMonths() {
    const months = calendarScroll.querySelectorAll(".calendar-month");

    if (!months.length) return;

    const lastMonth = months[months.length - 1];

    const year = Number(lastMonth.dataset.year);
    const month = Number(lastMonth.dataset.month);

    for (let i = 1; i <= 3; i++) {
        const date = new Date(year, month + i, 1);

        calendarScroll.appendChild(
            createMonth(date.getFullYear(), date.getMonth())
        );
    }
}


/* =========================================================
   ОТКРЫТИЕ / ЗАКРЫТИЕ КАЛЕНДАРЯ
   ========================================================= */

function openCalendar() {
    calendarOverlay.classList.add("open");
    document.body.style.overflow = "hidden";

    setModeText(
        periods.length
            ? "Нажми на день, чтобы отметить месячные"
            : "Нажми на первый день месячных"
    );

    renderCalendar();
}

function closeCalendar() {
    calendarOverlay.classList.remove("open");
    document.body.style.overflow = "";
}

calendarButton?.addEventListener("click", openCalendar);
periodButton?.addEventListener("click", openCalendar);
calendarClose?.addEventListener("click", closeCalendar);


/* =========================================================
   САМОЧУВСТВИЕ: ЧЕРНОВИК И ОКНО
   ========================================================= */

let draft = { mood: null, symptoms: [], pain: 0, note: "" };

function createOption(className, html, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.innerHTML = html;
    button.addEventListener("click", onClick);

    return button;
}

function buildSymptomsSheet() {

    /* Настроение (нажатие второй раз снимает выбор) */

    MOODS.forEach(mood => {
        const option = createOption(
            "mood-option",
            `<span class="mood-emoji">${mood.emoji}</span><span>${mood.label}</span>`,
            () => {
                draft.mood = draft.mood === mood.id ? null : mood.id;
                renderDraft();
            }
        );

        option.dataset.id = mood.id;
        moodRow.appendChild(option);
    });

    /* Симптомы */

    SYMPTOMS.forEach(symptom => {
        const chip = createOption("chip", "", () => {
            const index = draft.symptoms.indexOf(symptom.id);

            if (index === -1) draft.symptoms.push(symptom.id);
            else draft.symptoms.splice(index, 1);

            renderDraft();
        });

        chip.textContent = symptom.label;
        chip.dataset.id = symptom.id;

        (symptom.group === "body" ? bodyChips : emotionChips).appendChild(chip);
    });

    /* Сила боли */

    PAIN_LEVELS.forEach(level => {
        const option = createOption("pain-option", level.label, () => {
            draft.pain = level.id;
            renderDraft();
        });

        option.dataset.id = level.id;
        painRow.appendChild(option);
    });

    symptomsNote.addEventListener("input", () => {
        draft.note = symptomsNote.value;
    });
}

function renderDraft() {
    moodRow.querySelectorAll(".mood-option").forEach(el => {
        el.classList.toggle("selected", Number(el.dataset.id) === draft.mood);
    });

    document.querySelectorAll(".chip").forEach(el => {
        el.classList.toggle("selected", draft.symptoms.includes(el.dataset.id));
    });

    painRow.querySelectorAll(".pain-option").forEach(el => {
        el.classList.toggle("selected", Number(el.dataset.id) === draft.pain);
    });

    painHint.classList.toggle("visible", draft.pain === 3);
}

function openSymptoms() {
    const entry = getSymptomsEntry(todayKey());

    draft = entry
        ? {
            mood: entry.mood,
            symptoms: [...entry.symptoms],
            pain: entry.pain,
            note: entry.note || ""
        }
        : { mood: null, symptoms: [], pain: 0, note: "" };

    symptomsNote.value = draft.note;

    renderDraft();

    symptomsOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeSymptoms() {
    symptomsOverlay.classList.remove("open");
    document.body.style.overflow = "";
}

function saveSymptoms() {
    const note = draft.note.trim();

    const isEmpty =
        draft.mood === null &&
        draft.symptoms.length === 0 &&
        draft.pain === 0 &&
        !note;

    // пустой ответ = очистить отметку за сегодня
    setSymptomsEntry(
        todayKey(),
        isEmpty
            ? null
            : {
                mood: draft.mood,
                symptoms: draft.symptoms,
                pain: draft.pain,
                note,
                updatedAt: new Date().toISOString()
            }
    );

    closeSymptoms();
    updateTodayCard();
}

symptomsButton?.addEventListener("click", openSymptoms);
symptomsClose?.addEventListener("click", closeSymptoms);
symptomsSave?.addEventListener("click", saveSymptoms);


/* =========================================================
   КАРТОЧКА "СЕГОДНЯ"
   ========================================================= */

function updateTodayCard() {
    const entry = getSymptomsEntry(todayKey());

    if (!entry) {
        todayQuestion.textContent = "Как ты себя чувствуешь?";
        symptomsButton.textContent = "Отметить симптомы";
        return;
    }

    const parts = [];

    const mood = getMood(entry.mood);
    if (mood) parts.push(`${mood.emoji} ${mood.label}`);

    if (entry.symptoms.length) {
        const names = entry.symptoms.map(getSymptomLabel);
        let text = names.slice(0, 2).join(", ");

        if (names.length > 2) text += ` и ещё ${names.length - 2}`;

        parts.push(text);
    }

    if (entry.pain > 0) {
        parts.push(`боль: ${getPainLabel(entry.pain).toLowerCase()}`);
    }

    todayQuestion.textContent = parts.length
        ? parts.join(" · ")
        : "Заметка сохранена";

    symptomsButton.textContent = "Изменить";
}


/* =========================================================
   ЗАКРЫТИЕ ОКОН (затемнение, Esc)
   ========================================================= */

calendarOverlay?.addEventListener("click", event => {
    if (event.target === calendarOverlay) closeCalendar();
});

symptomsOverlay?.addEventListener("click", event => {
    if (event.target === symptomsOverlay) closeSymptoms();
});

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (calendarOverlay.classList.contains("open")) closeCalendar();
    if (symptomsOverlay.classList.contains("open")) closeSymptoms();
});


/* =========================================================
   АКТУАЛЬНАЯ ДАТА
   Приложение может долго висеть в памяти (Telegram не выгружает
   Mini App) или вернуться из кэша при нажатии "назад".
   Поэтому всё, что зависит от "сегодня", пересчитываем:
   - при возвращении в приложение,
   - при возврате на страницу из кэша,
   - ровно в полночь.
   ========================================================= */

function refreshToday() {
    recalculate();

    renderDateStrip();
    updateCycleOnMain();
    updateTodayCard();

    if (calendarOverlay.classList.contains("open")) {
        refreshCalendar();
    }
}

function scheduleMidnightRefresh() {
    const now = new Date();

    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 1
    );

    setTimeout(() => {
        refreshToday();
        scheduleMidnightRefresh();
    }, nextMidnight - now);
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshToday();
});

window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-exit");
    refreshToday();
});


/* =========================================================
   ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ
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


/* =========================================================
   ЗАПУСК
   ========================================================= */

buildSymptomsSheet();
refreshToday();
scheduleMidnightRefresh();