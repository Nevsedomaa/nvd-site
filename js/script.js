function initHeader() {
    const header = document.querySelector(".header");
    const burger = document.querySelector(".burger");
    const nav = document.querySelector(".header__nav");

    if (!header) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 40) {
            header.classList.add("header--scrolled");
        } else {
            header.classList.remove("header--scrolled");
        }
    });

    if (!burger || !nav) return;

    burger.addEventListener("click", () => {
        burger.classList.toggle("burger--active");
        nav.classList.toggle("header__nav--active");
        document.body.classList.toggle("menu-open");
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            burger.classList.remove("burger--active");
            nav.classList.remove("header__nav--active");
            document.body.classList.remove("menu-open");
        });
    });
}

function initRevealAnimation() {
    const elements = document.querySelectorAll("[data-reveal]");

    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.14
    });

    elements.forEach((element) => {
        observer.observe(element);
    });
}

function initHeroParallax() {
    const hero = document.querySelector(".hero");
    const heroBg = document.querySelector(".hero__bg");

    if (!hero || !heroBg) return;

    hero.addEventListener("mousemove", (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 12;
        const y = (event.clientY / window.innerHeight - 0.5) * 12;

        heroBg.style.transform = `scale(1.03) translate(${x}px, ${y}px)`;
    });

    hero.addEventListener("mouseleave", () => {
        heroBg.style.transform = "scale(1.03) translate(0, 0)";
    });
}

function initHeroTitleSwap() {
    const title = document.querySelector("[data-hero-title-swap]");

    if (!title) return;

    const toggleTitle = () => {
        const isSwapped = title.classList.toggle("is-swapped");
        title.setAttribute("aria-pressed", String(isSwapped));
    };

    title.addEventListener("click", toggleTitle);

    title.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        toggleTitle();
    });
}

function initAudioButtons() {
    const buttons = document.querySelectorAll(".audio-btn");

    let currentAudio = null;
    let currentButton = null;

    buttons.forEach((button) => {
        const defaultText = button.textContent.trim();
        button.dataset.defaultText = defaultText;

        button.addEventListener("click", () => {
            const audioSrc = button.dataset.audio;

            if (!audioSrc) return;

            if (currentAudio && currentButton === button && !currentAudio.paused) {
                currentAudio.pause();
                button.textContent = button.dataset.defaultText;
                button.classList.remove("is-playing");
                return;
            }

            if (currentAudio) {
                currentAudio.pause();

                if (currentButton) {
                    currentButton.textContent = currentButton.dataset.defaultText;
                    currentButton.classList.remove("is-playing");
                }
            }

            currentAudio = new Audio(audioSrc);
            currentButton = button;

            currentAudio.play()
                .then(() => {
                    button.textContent = "Ⅱ Пауза";
                    button.classList.add("is-playing");
                })
                .catch(() => {
                    console.warn("Не удалось воспроизвести аудио. Проверь путь:", audioSrc);
                });

            currentAudio.addEventListener("ended", () => {
                button.textContent = button.dataset.defaultText;
                button.classList.remove("is-playing");
            });
        });
    });
}

function initScrollTopButton() {
    const scrollTopButton = document.querySelector(".scroll-top");

    if (!scrollTopButton) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 650) {
            scrollTopButton.classList.add("scroll-top--visible");
        } else {
            scrollTopButton.classList.remove("scroll-top--visible");
        }
    });

    scrollTopButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

function disableImageDragging() {
    document.addEventListener("dragstart", (event) => {
        if (event.target && event.target.tagName === "IMG") {
            event.preventDefault();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initRevealAnimation();
    initHeroParallax();
    initHeroTitleSwap();
    initAudioButtons();
    initScrollTopButton();
    disableImageDragging();
});
