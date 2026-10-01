/* =========================================================
   transitions.js — плавные переходы между страницами
   Подключить в <head> КАЖДОЙ страницы (без defer):
   <script src="transitions.js"></script>

   Что делает:
   - все обычные ссылки <a href="..."> уходят с анимацией
   - ссылка с атрибутом data-back считается "назад"
     (страница уезжает вправо, а следующая приезжает слева)
   - window.navigateTo(url)      — перейти вперёд из кода
   - window.navigateBack(запасной_адрес) — вернуться назад из кода
   ========================================================= */

(function () {

    const DURATION = 300;
    const STORAGE_KEY = "pageTransition";
    const root = document.documentElement;

    let leaving = false;


    /* ---- направление появления этой страницы ---- */

    function applyEnterDirection() {
        let direction = null;

        try {
            direction = sessionStorage.getItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) { /* не страшно */ }

        root.classList.toggle("enter-back", direction === "back");
    }

    applyEnterDirection();


    function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function resetExit() {
        leaving = false;
        document.body?.classList.remove("page-exit", "page-exit-back");
    }


    /* ---- уход со страницы ---- */

    function leave(isBack, action) {
        if (leaving) return;

        leaving = true;

        try {
            sessionStorage.setItem(STORAGE_KEY, isBack ? "back" : "forward");
        } catch (error) { /* не страшно */ }

        document.body.classList.add(isBack ? "page-exit-back" : "page-exit");

        setTimeout(action, prefersReducedMotion() ? 0 : DURATION);

        // Если переход почему-то не случился — не оставляем страницу "прозрачной"
        setTimeout(resetExit, DURATION + 1500);
    }

    window.navigateTo = function (url) {
        leave(false, () => { window.location.href = url; });
    };

    window.navigateBack = function (fallbackUrl) {
        leave(true, () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = fallbackUrl || "index.html";
            }
        });
    };


    /* ---- перехват обычных ссылок ---- */

    document.addEventListener("click", event => {

        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        ) {
            return;
        }

        const link = event.target.closest("a[href]");

        if (!link || link.target === "_blank" || link.hasAttribute("download")) {
            return;
        }

        const href = link.getAttribute("href");

        if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
            return;
        }

        const url = new URL(link.href, window.location.href);

        // внешние ссылки (Telegram, сайты) не трогаем
        if (url.origin !== window.location.origin) return;

        event.preventDefault();

        // ссылка на ту же страницу: ничего не делаем
        if (url.href === window.location.href) return;

        leave(link.hasAttribute("data-back"), () => {
            window.location.href = url.href;
        });
    });


    /* ---- возврат на страницу из кэша ("назад" в браузере) ---- */

    window.addEventListener("pageshow", event => {

        resetExit();

        if (event.persisted) {
            applyEnterDirection();

            // проигрываем анимацию появления заново
            document.body.style.animation = "none";
            void document.body.offsetWidth;
            document.body.style.animation = "";
        }
    });

})();
