(function () {
    const releases = window.RELEASES_DATA || [];
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("id");

    const elements = {
        page: document.querySelector(".lyric-page"),
        title: document.querySelector("[data-lyric-title]"),
        meta: document.querySelector("[data-lyric-meta]"),
        body: document.querySelector("[data-lyric-body]"),
        albumLink: document.querySelector("[data-album-link]"),
        serviceLink: document.querySelector("[data-service-link]")
    };

    function findTrack() {
        for (const album of releases) {
            const track = (album.tracks || []).find((item) => item.id === trackId);

            if (track) {
                return { album, track };
            }
        }

        return null;
    }

    function getLyricParagraphs(lyrics) {
        const lines = Array.isArray(lyrics)
            ? lyrics
            : String(lyrics || "").split(/\r?\n/);
        const paragraphs = [];
        let current = [];

        lines.forEach((rawLine) => {
            const line = String(rawLine || "").trim();

            if (!line) {
                if (current.length) {
                    paragraphs.push(current);
                    current = [];
                }
                return;
            }

            current.push(line);
        });

        if (current.length) {
            paragraphs.push(current);
        }

        return paragraphs;
    }

    function renderLyricBody(lyrics) {
        if (!elements.body) return;

        const paragraphs = getLyricParagraphs(lyrics);
        elements.body.innerHTML = "";

        paragraphs.forEach((paragraphLines) => {
            const paragraph = document.createElement("p");
            paragraph.textContent = paragraphLines.join("\n");
            elements.body.appendChild(paragraph);
        });
    }

    function renderNotFound() {
        if (!elements.page) return;

        elements.page.innerHTML = `
            <div class="container lyric-page__container">
                <div class="lyric-page__empty">
                    <h1>Текст не найден</h1>
                    <p>Проверь ссылку или вернись ко всем текстам.</p>
                    <a href="lyrics.html" class="lyric-page__back">← Все тексты</a>
                </div>
            </div>
        `;
    }

    function renderLyric() {
        const result = findTrack();

        if (!result) {
            renderNotFound();
            return;
        }

        const { album, track } = result;
        const service = (album.services || []).find((item) => item.title.toLowerCase().includes("яндекс")) || album.services[0];
        const serviceUrl = service && service.url;

        document.title = `${track.title} - текст песни`;

        if (elements.title) {
            elements.title.textContent = track.title;
        }

        if (elements.meta) {
            elements.meta.textContent = `${album.type} «${album.title}» (${album.year})`;
        }

        renderLyricBody(track.lyrics);

        if (elements.albumLink) {
            elements.albumLink.href = `album.html?id=${encodeURIComponent(album.id)}`;
        }

        if (elements.serviceLink) {
            elements.serviceLink.href = serviceUrl && serviceUrl !== "#"
                ? serviceUrl
                : `https://music.yandex.ru/search?text=${encodeURIComponent(`Не все дома ${album.title}`)}`;
            elements.serviceLink.target = "_blank";
            elements.serviceLink.rel = "noopener";
        }
    }

    document.addEventListener("DOMContentLoaded", renderLyric);
})();
