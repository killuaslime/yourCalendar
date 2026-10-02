/* =========================================================
   ГЛОБАЛЬНАЯ ТЕМА
   ========================================================= */

const THEME_STORAGE_KEY = "yourCalendarTheme";


function getSavedTheme() {

    try {

        return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
            ? "dark"
            : "light";

    } catch (error) {

        return "light";

    }

}


function applyTheme(theme) {

    const normalizedTheme =
        theme === "dark" ? "dark" : "light";


    document.documentElement.dataset.theme =
        normalizedTheme;


    if (document.body) {

        document.body.classList.toggle(
            "dark-theme",
            normalizedTheme === "dark"
        );

    }


    return normalizedTheme;

}


function saveTheme(theme) {

    try {

        localStorage.setItem(
            THEME_STORAGE_KEY,
            theme
        );

    } catch (error) {

        console.warn(
            "Не удалось сохранить тему:",
            error
        );

    }

}


/* Применяем тему до отрисовки body, чтобы не было вспышки светлой темы. */
applyTheme(getSavedTheme());


window.AppTheme = {

    get: getSavedTheme,

    set(theme) {

        const appliedTheme =
            applyTheme(theme);

        saveTheme(appliedTheme);

        return appliedTheme;

    }

};


document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyTheme(getSavedTheme());

    }
);
