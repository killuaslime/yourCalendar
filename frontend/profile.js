const urlParams = new URLSearchParams(window.location.search);

const profileType = urlParams.get("type");


const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const avatarProgress = document.getElementById("avatarProgress");

const backButton = document.getElementById("backButton");

const leftArea = document.getElementById("leftArea");
const rightArea = document.getElementById("rightArea");


let avatars = [];
let currentIndex = 0;


/* =====================================================
   ПРОФИЛЬ ПЕРСОНАЖА
   ===================================================== */

const characterId = urlParams.get("id");

const characterProfile =
    (typeof getCharacter === "function" && getCharacter(characterId)) || {

        name: "Луна",

        username: "@luna_calendar",

        avatars: [
            "avatars/luna/avatar1.png"
        ]

    };


/* =====================================================
   ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ TELEGRAM
   ===================================================== */

function loadTelegramProfile() {

    const telegram = window.Telegram?.WebApp;


    if (!telegram) {

        console.log("Telegram WebApp не найден");

        profileName.textContent = "Пользователь";
        profileUsername.textContent = "@username";

        avatars = [
            "avatars/userPicture.png"
        ];

        return;

    }


    telegram.ready();


    const user = telegram.initDataUnsafe?.user;


    if (!user) {

        console.log("Данные пользователя Telegram недоступны");

        profileName.textContent = "Пользователь";
        profileUsername.textContent = "@username";

        avatars = [
            "avatars/userPicture.png"
        ];

        return;

    }


    /* =========================
       ИМЯ
       ========================= */

    let fullName = user.first_name || "";


    if (user.last_name) {

        fullName += " " + user.last_name;

    }


    profileName.textContent =
        fullName || "Пользователь";


    /* =========================
       USERNAME
       ========================= */

    if (user.username) {

        profileUsername.textContent =
            "@" + user.username;

    } else {

        profileUsername.textContent =
            "username не указан";

    }


    /* =========================
       АВАТАР TELEGRAM
       ========================= */

    if (user.photo_url) {

        avatars = [
            user.photo_url
        ];

    } else {

        avatars = [
            "avatars/userPicture.png"
        ];

    }

}


/* =====================================================
   ЗАГРУЗКА ПРОФИЛЯ
   ===================================================== */

function loadProfile() {


    if (profileType === "user") {

        loadTelegramProfile();

    }

    else {

        profileName.textContent =
            characterProfile.name;

        profileUsername.textContent =
            characterProfile.username;

        avatars =
            characterProfile.avatars;

    }


    currentIndex = 0;

    createProgressBars();

    updateAvatar();

}


/* =====================================================
   ПОЛОСКИ
   ===================================================== */

function createProgressBars() {

    avatarProgress.innerHTML = "";


    avatars.forEach((avatar, index) => {

        const bar =
            document.createElement("div");


        bar.classList.add("progress-bar");


        if (index === currentIndex) {

            bar.classList.add("active");

        }


        avatarProgress.appendChild(bar);

    });

}


/* =====================================================
   ОБНОВЛЕНИЕ АВАТАРКИ
   ===================================================== */

function updateAvatar(direction = null) {

    profileImage.classList.remove(
        "slide-left",
        "slide-right"
    );


    void profileImage.offsetWidth;


    profileImage.src =
        avatars[currentIndex];


    if (direction === "next") {

        profileImage.classList.add(
            "slide-left"
        );

    }


    if (direction === "previous") {

        profileImage.classList.add(
            "slide-right"
        );

    }


    createProgressBars();

}


/* =====================================================
   СЛЕДУЮЩАЯ
   ===================================================== */

function nextAvatar() {

    if (
        currentIndex <
        avatars.length - 1
    ) {

        currentIndex++;

        updateAvatar("next");

    }

}


/* =====================================================
   ПРЕДЫДУЩАЯ
   ===================================================== */

function previousAvatar() {

    if (currentIndex > 0) {

        currentIndex--;

        updateAvatar("previous");

    }

}


/* =====================================================
   ТАП СПРАВА
   ===================================================== */

rightArea.addEventListener(
    "click",
    nextAvatar
);


/* =====================================================
   ТАП СЛЕВА
   ===================================================== */

leftArea.addEventListener(
    "click",
    previousAvatar
);


/* =====================================================
   НАЗАД
   ===================================================== */

backButton.addEventListener(
    "click",
    () => {

        history.back();

    }
);


/* =====================================================
   СВАЙП
   ===================================================== */

let touchStartX = 0;
let touchEndX = 0;


document.addEventListener(
    "touchstart",
    (event) => {

        touchStartX =
            event.changedTouches[0].screenX;

    }
);


document.addEventListener(
    "touchend",
    (event) => {

        touchEndX =
            event.changedTouches[0].screenX;


        const distance =
            touchEndX - touchStartX;


        if (Math.abs(distance) < 50) {

            return;

        }


        if (distance < 0) {

            nextAvatar();

        }


        if (distance > 0) {

            previousAvatar();

        }

    }
);


/* =====================================================
   ЗАПУСК
   ===================================================== */

loadProfile();