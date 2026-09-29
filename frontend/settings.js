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