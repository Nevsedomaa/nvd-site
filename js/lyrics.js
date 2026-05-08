(function () {
    const releases = window.RELEASES_DATA || [];
    const searchInput = document.querySelector("[data-lyrics-search]");
    const clearButton = document.querySelector("[data-lyrics-clear]");
    const albumSelect = document.querySelector("[data-lyrics-album]");
    const list = document.querySelector("[data-lyrics-list]");
    const count = document.querySelector("[data-lyrics-count]");
    const empty = document.querySelector("[data-lyrics-empty]");

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getTracks() {
        return releases.flatMap((album) => {
            return (album.tracks || []).map((track) => ({
                ...track,
                albumId: album.id,
                albumTitle: album.title,
                albumYear: album.year,
                albumType: album.type
            }));
        });
    }

    const tracks = getTracks();

    function renderAlbumOptions() {
        if (!albumSelect) return;

        albumSelect.innerHTML = [
            '<option value="">Все альбомы</option>',
            ...releases.map((album) => {
                return `<option value="${escapeHtml(album.id)}">${escapeHtml(album.title)}</option>`;
            })
        ].join("");
    }

    function render(items) {
        if (!list) return;

        list.innerHTML = items.map((track) => {
            const title = escapeHtml(track.title);
            const excerpt = escapeHtml(track.lyricsExcerpt || "Строчка из песни");
            const meta = escapeHtml(`${track.albumTitle} (${track.albumYear})`);
            const url = `lyric.html?id=${encodeURIComponent(track.id)}`;

            return `
                <a class="lyrics-card" href="${url}">
                    <h2>${title}</h2>
                    <p class="lyrics-card__line">"${excerpt}"</p>
                    <p class="lyrics-card__meta">${meta}</p>
                </a>
            `;
        }).join("");

        if (count) {
            count.textContent = `${items.length} ${items.length === 1 ? "текст" : "текстов"}`;
        }

        if (empty) {
            empty.hidden = items.length > 0;
        }
    }

    function filterTracks() {
        const query = (searchInput && searchInput.value || "").trim().toLowerCase();
        const albumId = albumSelect && albumSelect.value || "";

        if (clearButton) {
            clearButton.classList.toggle("is-visible", Boolean(query));
        }

        render(tracks.filter((track) => {
            if (albumId && track.albumId !== albumId) return false;
            if (!query) return true;

            return [
                track.title,
                track.albumTitle,
                track.albumYear,
                track.lyricsExcerpt
            ].some((value) => String(value || "").toLowerCase().includes(query));
        }));
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderAlbumOptions();
        render(tracks);

        if (searchInput) {
            searchInput.addEventListener("input", filterTracks);
        }

        if (clearButton && searchInput) {
            clearButton.addEventListener("click", () => {
                searchInput.value = "";
                searchInput.focus();
                filterTracks();
            });
        }

        if (albumSelect) {
            albumSelect.addEventListener("change", filterTracks);
        }
    });
})();
