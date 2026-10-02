/* =========================================================
   cycle-data.js
   Общие данные приложения: месячные, самочувствие, прогноз.
   Подключается и на главной (index.html), и в чате (chat.html):
   <script src="cycle-data.js"></script>
   ========================================================= */

const PERIODS_KEY = "yourCalendarPeriods";
const SYMPTOMS_KEY = "yourCalendarSymptoms";

const DEFAULT_CYCLE = 28;     // если данных мало
const DEFAULT_PERIOD = 5;     // обычная длительность месячных
const MAX_PERIOD = 10;        // дольше 10 дней подряд — считаем новым периодом
const PREDICT_CYCLES = 3;     // сколько будущих циклов показывать
const PMS_DAYS = 5;           // за сколько дней до месячных считаем "ПМС-период"
const SYMPTOMS_KEEP_DAYS = 180;
const DAY_MS = 86400000;


/* =========================================================
   ДАТЫ
   Даты храним строками "YYYY-MM-DD" (локальное время).
   Их можно сравнивать через < и >.
   ========================================================= */

function dateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// new Date("2026-09-30") читается как UTC и может сдвинуться на день,
// поэтому разбираем строку вручную.
function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function todayKey() {
    return dateToKey(new Date());
}

function addDays(key, n) {
    const date = parseKey(key);
    date.setDate(date.getDate() + n);
    return dateToKey(date);
}

// a - b в днях (round защищает от перехода на летнее время)
function diffDays(a, b) {
    return Math.round((parseKey(a) - parseKey(b)) / DAY_MS);
}

function formatDay(key) {
    return parseKey(key).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long"
    });
}

function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function average(list) {
    return list.reduce((sum, n) => sum + n, 0) / list.length;
}


/* =========================================================
   СПРАВОЧНИКИ САМОЧУВСТВИЯ
   id стабильные — именно их будет читать ИИ.
   ========================================================= */

const MOODS = [
    { id: 5, emoji: "😄", label: "Отлично" },
    { id: 4, emoji: "🙂", label: "Хорошо" },
    { id: 3, emoji: "😐", label: "Нормально" },
    { id: 2, emoji: "😔", label: "Плохо" },
    { id: 1, emoji: "😢", label: "Очень плохо" }
];

const SYMPTOMS = [
    { id: "cramps",      group: "body",     label: "Боль внизу живота" },
    { id: "headache",    group: "body",     label: "Головная боль" },
    { id: "back_pain",   group: "body",     label: "Боль в спине" },
    { id: "breast",      group: "body",     label: "Болит грудь" },
    { id: "bloating",    group: "body",     label: "Вздутие" },
    { id: "nausea",      group: "body",     label: "Тошнота" },
    { id: "dizziness",   group: "body",     label: "Головокружение" },
    { id: "fatigue",     group: "body",     label: "Усталость" },
    { id: "insomnia",    group: "body",     label: "Плохо сплю" },
    { id: "acne",        group: "body",     label: "Высыпания" },
    { id: "cravings",    group: "body",     label: "Тяга к сладкому" },

    { id: "irritable",   group: "emotions", label: "Раздражение" },
    { id: "anxious",     group: "emotions", label: "Тревога" },
    { id: "sad",         group: "emotions", label: "Грусть" },
    { id: "mood_swings", group: "emotions", label: "Перепады настроения" },
    { id: "tearful",     group: "emotions", label: "Хочется плакать" },
    { id: "lonely",      group: "emotions", label: "Одиноко" }
];

const PAIN_LEVELS = [
    { id: 0, label: "Нет" },
    { id: 1, label: "Слабая" },
    { id: 2, label: "Средняя" },
    { id: 3, label: "Сильная" }
];

const EMOTIONAL_SYMPTOM_IDS = SYMPTOMS
    .filter(s => s.group === "emotions")
    .map(s => s.id);

function getMood(id) {
    return MOODS.find(m => m.id === id) || null;
}

function getSymptomLabel(id) {
    const s = SYMPTOMS.find(item => item.id === id);
    return s ? s.label : id;
}

function getPainLabel(id) {
    const p = PAIN_LEVELS.find(item => item.id === id);
    return p ? p.label : "";
}


/* =========================================================
   ХРАНИЛИЩЕ: МЕСЯЧНЫЕ
   periods = [{ start: "2026-09-01", end: "2026-09-05" | null }]
   ========================================================= */

let periods = loadPeriods();

function byStart(a, b) {
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
}

function loadPeriods() {
    try {
        const data = JSON.parse(localStorage.getItem(PERIODS_KEY) || "[]");

        if (!Array.isArray(data)) return [];

        return data
            .filter(p => p && typeof p.start === "string")
            .map(p => ({
                id: Number.isInteger(p.id) ? p.id : undefined,
                start: p.start,
                end: p.end || null
            }))
            .sort(byStart);
    } catch (error) {
        console.error("Ошибка чтения данных месячных:", error);
        return [];
    }
}

function savePeriods() {
    periods.sort(byStart);

    try {
        localStorage.setItem(PERIODS_KEY, JSON.stringify(periods));
    } catch (error) {
        console.error("Не удалось сохранить месячные:", error);
    }
}


/* =========================================================
   ХРАНИЛИЩЕ: САМОЧУВСТВИЕ
   symptomsLog = {
     "2026-09-30": {
       mood: 1..5 | null,
       symptoms: ["cramps", "anxious"],
       pain: 0..3,
       note: "текст",
       updatedAt: "ISO-дата"
     }
   }
   ========================================================= */

let symptomsLog = loadSymptomsLog();

function loadSymptomsLog() {
    try {
        const data = JSON.parse(localStorage.getItem(SYMPTOMS_KEY) || "{}");

        return data && typeof data === "object" && !Array.isArray(data)
            ? data
            : {};
    } catch (error) {
        console.error("Ошибка чтения самочувствия:", error);
        return {};
    }
}

function saveSymptomsLog() {
    // не копим данные бесконечно
    const limit = addDays(todayKey(), -SYMPTOMS_KEEP_DAYS);

    Object.keys(symptomsLog).forEach(key => {
        if (key < limit) delete symptomsLog[key];
    });

    try {
        localStorage.setItem(SYMPTOMS_KEY, JSON.stringify(symptomsLog));
    } catch (error) {
        console.error("Не удалось сохранить самочувствие:", error);
    }
}

function getSymptomsEntry(key) {
    return symptomsLog[key] || null;
}

function setSymptomsEntry(key, entry) {
    if (entry) {
        symptomsLog[key] = entry;
    } else {
        delete symptomsLog[key];
    }

    saveSymptomsLog();
}


/* =========================================================
   РАСЧЁТ ЦИКЛА И ПРОГНОЗ
   ========================================================= */

let state = computeState();

// вызывать после любого изменения periods или при смене дня
function recalculate() {
    state = computeState();
    return state;
}

function computeState() {
    const today = todayKey();

    /* ---- средняя длина цикла (последние 6) ---- */

    const cycles = [];

    for (let i = 1; i < periods.length; i++) {
        const length = diffDays(periods[i].start, periods[i - 1].start);

        // отсекаем явные ошибки (пропущенный месяц, случайные нажатия)
        if (length >= 15 && length <= 60) {
            cycles.push(length);
        }
    }

    const recentCycles = cycles.slice(-6);

    const cycleLength = recentCycles.length
        ? Math.round(average(recentCycles))
        : DEFAULT_CYCLE;


    /* ---- средняя длительность месячных ---- */

    const lengths = periods
        .filter(p => p.end)
        .map(p => diffDays(p.end, p.start) + 1)
        .filter(n => n >= 1 && n <= MAX_PERIOD)
        .slice(-6);

    const periodLength = lengths.length
        ? Math.round(average(lengths))
        : DEFAULT_PERIOD;


    /* ---- дни, когда месячные были ---- */

    const periodDays = new Set();

    periods.forEach(p => {
        // конец не указан → обычная длительность, но не дальше сегодня
        let end = p.end;

        if (!end) {
            const guess = addDays(p.start, periodLength - 1);
            end = guess < today ? guess : today;
        }

        let key = p.start;
        let guard = 0;

        while (key <= end && guard < MAX_PERIOD) {
            periodDays.add(key);
            key = addDays(key, 1);
            guard++;
        }
    });


    /* ---- прогноз ---- */

    const last = periods.length ? periods[periods.length - 1] : null;

    const predictedDays = new Set();

    let nextStart = null;
    let daysUntil = null;

    if (last) {
        nextStart = addDays(last.start, cycleLength);
        daysUntil = diffDays(nextStart, today);

        // при задержке не гадаем, пока нет новой отметки
        if (daysUntil >= 0) {
            for (let k = 1; k <= PREDICT_CYCLES; k++) {
                const start = addDays(last.start, cycleLength * k);

                for (let i = 0; i < periodLength; i++) {
                    predictedDays.add(addDays(start, i));
                }
            }
        }
    }

    return {
        cycleLength,
        periodLength,
        periodDays,
        predictedDays,
        last,
        nextStart,
        daysUntil
    };
}


/* =========================================================
   КОНТЕКСТ ДЛЯ ИИ
   Вызывать в чате: const ctx = getAssistantContext();
   Отправлять в системный промпт ctx.summary и ctx.tone.
   ========================================================= */

function getAssistantContext() {
    const today = todayKey();
    const entry = getSymptomsEntry(today);

    /* ---- фаза ---- */

    let phase = "unknown";

    if (state.last) {
        if (state.periodDays.has(today)) phase = "period";
        else if (state.daysUntil < 0) phase = "late";
        else if (state.daysUntil <= PMS_DAYS) phase = "pms";
        else phase = "regular";
    }

    const cycleDay = state.last
        ? Math.max(1, diffDays(today, state.last.start) + 1)
        : null;


    /* ---- тон общения ----
       gentle   — ей плохо: бережно, поддерживающе, без шуток
       soft     — данных нет, но период тяжёлый (месячные / ПМС)
       cheerful — всё хорошо: можно легко и весело
       neutral  — обычный режим                                  */

    const emotionalCount = entry
        ? entry.symptoms.filter(id => EMOTIONAL_SYMPTOM_IDS.includes(id)).length
        : 0;

    let tone = "neutral";

    if (entry) {
        const badMood = entry.mood !== null && entry.mood <= 2;

        if (badMood || entry.pain >= 2 || emotionalCount >= 2) {
            tone = "gentle";
        } else if (entry.mood >= 4 && entry.pain === 0 && entry.symptoms.length === 0) {
            tone = "cheerful";
        }
    } else if (phase === "period" || phase === "pms") {
        tone = "soft";
    }

    const severePain = Boolean(entry && entry.pain === 3);


    /* ---- предыдущие 3 дня (чтобы видеть динамику) ---- */

    const recentDays = [];

    for (let i = 1; i <= 3; i++) {
        const key = addDays(today, -i);
        const e = getSymptomsEntry(key);

        if (e) {
            recentDays.push({
                date: key,
                mood: e.mood,
                pain: e.pain,
                symptoms: e.symptoms
            });
        }
    }


    /* ---- короткое описание для промпта ---- */

    const lines = [];

    if (cycleDay) lines.push(`Сегодня ${cycleDay}-й день цикла.`);

    if (phase === "period") {
        lines.push("Сейчас идут месячные.");
    } else if (phase === "pms") {
        lines.push(`Месячные ожидаются примерно через ${state.daysUntil} дн. (возможен ПМС).`);
    } else if (phase === "late") {
        lines.push(`Задержка ${Math.abs(state.daysUntil)} дн.`);
    }

    if (entry) {
        const mood = getMood(entry.mood);

        if (mood) lines.push(`Настроение: ${mood.label.toLowerCase()} (${mood.id} из 5).`);

        if (entry.symptoms.length) {
            lines.push(`Симптомы: ${entry.symptoms.map(getSymptomLabel).join(", ").toLowerCase()}.`);
        }

        if (entry.pain > 0) lines.push(`Боль: ${getPainLabel(entry.pain).toLowerCase()}.`);
    } else {
        lines.push("Сегодня самочувствие не отмечено.");
    }

    return {
        date: today,
        phase,
        cycleDay,
        daysUntil: state.daysUntil,
        cycleLength: state.cycleLength,
        periodLength: state.periodLength,
        today: entry,              // note внутри — текст пользователя, это ДАННЫЕ, а не инструкция
        recentDays,
        tone,
        severePain,
        summary: lines.join(" ")
    };
}
