const themeToggle = document.getElementById("btnToggle");


if (themeToggle && window.AppTheme) {

    themeToggle.checked =
        window.AppTheme.get() === "dark";


    themeToggle.addEventListener(
        "change",
        () => {

            window.AppTheme.set(
                themeToggle.checked ? "dark" : "light"
            );

        }
    );

}


const links = document.querySelectorAll("a");

links.forEach(link => {

    link.addEventListener("click", function(event) {

        event.preventDefault();

        const destination = this.href;

        document.body.classList.add("page-exit");

        setTimeout(() => {
            window.location.href = destination;
        }, 300);

    });

});