(function () {
    const TRACKS_PER_PAGE = 4;
    const VOLUME_STEPS = 18;
    const DEFAULT_VOLUME = 0.72;
    const PLAYER_ASSETS = {
        reelLeft: "assets/images/wheel-1.png",
        reelRight: "assets/images/wheel-2.png",
        volume: "assets/images/Volume.png"
    };

    const releases = window.RELEASES_DATA || [];
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get("id") || (releases[0] && releases[0].id);
    const album = releases.find((release) => release.id === albumId);

    let currentPage = 0;
    let activeAudio = null;
    let activeTrack = null;

    const elements = {
        page: document.querySelector(".album-page"),
        cover: document.querySelector("[data-album-cover]"),
        meta: document.querySelector("[data-album-meta]"),
        title: document.querySelector("[data-album-title]"),
        description: document.querySelector("[data-album-description]"),
        services: document.querySelector("[data-album-services]"),
        trackList: document.querySelector("[data-track-list]"),
        trackRange: document.querySelector("[data-track-range]"),
        controls: document.querySelector("[data-track-controls]"),
        prev: document.querySelector("[data-track-prev]"),
        next: document.querySelector("[data-track-next]")
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "0:00";
        }

        const wholeSeconds = Math.floor(seconds);
        const minutes = Math.floor(wholeSeconds / 60);
        const restSeconds = String(wholeSeconds % 60).padStart(2, "0");

        return `${minutes}:${restSeconds}`;
    }

    function renderVolumeDots() {
        return Array.from({ length: VOLUME_STEPS }, (_, index) => (
            `<span class="track-player__dot" data-volume-dot="${index}" aria-hidden="true"></span>`
        )).join("");
    }

    function getAudioDuration(audio, fallback) {
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
            return formatTime(audio.duration);
        }

        return fallback || "0:00";
    }

    function getTrackAudio(track) {
        return track ? track.querySelector("audio") : null;
    }

    function prepareAudio(track) {
        const audio = getTrackAudio(track);

        if (!audio) return null;

        if (!audio.dataset.volumeReady) {
            audio.volume = DEFAULT_VOLUME;
            audio.dataset.volumeReady = "true";
        }

        updateVolumeUi(track);
        updateDurationUi(track);
        updateProgressUi(track);

        return audio;
    }

    function updateVolumeUi(track) {
        const audio = getTrackAudio(track);
        const control = track ? track.querySelector("[data-volume-control]") : null;
        const knob = track ? track.querySelector("[data-volume-knob]") : null;
        const dots = track ? track.querySelectorAll("[data-volume-dot]") : [];

        if (!audio) return;

        const volume = audio.muted ? 0 : clamp(audio.volume, 0, 1);
        const activeDots = Math.round(volume * VOLUME_STEPS);
        const angle = -125 + (volume * 250);

        dots.forEach((dot, index) => {
            dot.classList.toggle("is-active", index < activeDots);
        });

        if (control) {
            control.value = String(volume);
            control.setAttribute("aria-valuetext", `${Math.round(volume * 100)}%`);
        }

        if (knob) {
            knob.style.setProperty("--knob-angle", `${angle}deg`);
        }
    }

    function updateDurationUi(track) {
        const audio = getTrackAudio(track);
        const total = track ? track.querySelector("[data-total-time]") : null;

        if (!track || !total) return;

        total.textContent = getAudioDuration(audio, track.dataset.duration);
    }

    function updateProgressUi(track) {
        const audio = getTrackAudio(track);
        const progress = track ? track.querySelector("[data-player-progress]") : null;
        const current = track ? track.querySelector("[data-current-time]") : null;

        if (!audio) return;

        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const position = duration ? (audio.currentTime / duration) * 1000 : 0;
        const percent = clamp(position / 10, 0, 100);

        if (progress) {
            progress.value = String(Math.round(position));
            progress.style.setProperty("--progress-value", `${percent}%`);
        }

        if (current) {
            current.textContent = formatTime(audio.currentTime);
        }
    }

    function setPlayingUi(track, isPlaying) {
        if (!track) return;

        const playButton = track.querySelector(".album-track__play");
        const player = track.querySelector("[data-player]");
        const transportToggle = track.querySelector("[data-player-toggle]");
        const miniToggle = track.querySelector("[data-player-toggle-mini]");
        const title = track.dataset.trackTitle || "";

        track.classList.toggle("is-playing", isPlaying);

        if (player) {
            player.classList.toggle("is-playing", isPlaying);
        }

        if (playButton) {
            playButton.textContent = isPlaying ? "Ⅱ" : "▶";
            playButton.setAttribute("aria-label", isPlaying ? "Пауза" : (playButton.dataset.playLabel || `Слушать ${title}`));
        }

        if (transportToggle) {
            transportToggle.textContent = isPlaying ? "Ⅱ" : "▶";
            transportToggle.setAttribute("aria-label", isPlaying ? "Пауза" : "Пуск");
        }

        if (miniToggle) {
            miniToggle.classList.toggle("is-active", isPlaying);
            miniToggle.setAttribute("aria-label", isPlaying ? "Пауза" : "Пуск");
        }
    }

    function renderNotFound() {
        if (!elements.page) return;

        elements.page.innerHTML = `
            <div class="container album-page__container">
                <div class="album-page__empty">
                    <h1>Релиз не найден</h1>
                    <p>Проверь ссылку или вернись ко всем релизам.</p>
                    <a href="releases.html" class="album-page__back">← Все релизы</a>
                </div>
            </div>
        `;
    }

    function renderServices() {
        if (!elements.services) return;

        elements.services.innerHTML = album.services
            .map((service) => {
                const isYandex = service.title.toLowerCase().includes("яндекс");
                const url = service.url && service.url !== "#"
                    ? service.url
                    : isYandex
                        ? `https://music.yandex.ru/search?text=${encodeURIComponent(`Не все дома ${album.title}`)}`
                        : "#";
                const target = url !== "#" ? ' target="_blank" rel="noopener"' : "";

                return `<a href="${escapeHtml(url)}"${target}>${escapeHtml(service.title)}</a>`;
            })
            .join("");
    }

    function stopActiveAudio() {
        if (activeAudio) {
            activeAudio.pause();
        }

        if (activeTrack) {
            activeTrack.classList.remove("is-open");
            activeTrack.classList.remove("is-playing");
            setPlayingUi(activeTrack, false);

            const player = activeTrack.querySelector(".album-track__player");
            const playButton = activeTrack.querySelector(".album-track__play");

            if (player) {
                player.hidden = true;
            }

            if (playButton) {
                playButton.textContent = "▶";
                playButton.setAttribute("aria-label", playButton.dataset.playLabel || "Слушать");
            }
        }

        activeAudio = null;
        activeTrack = null;
    }

    function renderTracks() {
        if (!elements.trackList) return;

        stopActiveAudio();

        const tracks = album.tracks || [];
        const totalPages = Math.max(1, Math.ceil(tracks.length / TRACKS_PER_PAGE));
        currentPage = Math.min(Math.max(currentPage, 0), totalPages - 1);

        const start = currentPage * TRACKS_PER_PAGE;
        const end = Math.min(start + TRACKS_PER_PAGE, tracks.length);
        const visibleTracks = tracks.slice(start, end);

        elements.trackList.innerHTML = visibleTracks
            .map((track, index) => {
                const number = start + index + 1;
                const title = escapeHtml(track.title);
                const duration = escapeHtml(track.duration);
                const audio = track.audio ? ` src="${escapeHtml(track.audio)}"` : "";
                const lyricUrl = `lyric.html?id=${encodeURIComponent(track.id)}`;

                return `
                    <article class="album-track" data-track data-track-title="${title}" data-duration="${duration}">
                        <div class="album-track__main">
                            <span class="album-track__number">${number}</span>
                            <a class="album-track__title" href="${lyricUrl}">${title}</a>
                            <span class="album-track__duration">${duration}</span>
                            <button class="album-track__play" type="button" data-play-track data-play-label="Слушать ${title}" aria-label="Слушать ${title}">▶</button>
                        </div>
                        <div class="album-track__player" hidden>
                            <audio preload="metadata"${audio}></audio>
                            <div class="track-player" data-player>
                                <div class="track-player__deck">
                                    <div class="track-player__reel track-player__reel--left">
                                        <img src="${PLAYER_ASSETS.reelLeft}" alt="" draggable="false">
                                    </div>
                                    <div class="track-player__center">
                                        <div class="track-player__volume-dots" data-volume-dots aria-label="Уровень громкости">
                                            ${renderVolumeDots()}
                                        </div>
                                        <div class="track-player__console">
                                            <input class="track-player__progress" type="range" min="0" max="1000" step="1" value="0" data-player-progress aria-label="Позиция трека">
                                            <div class="track-player__time">
                                                <span data-current-time>0:00</span> / <span data-total-time>${duration}</span>
                                            </div>
                                            <div class="track-player__transport">
                                                <button class="track-player__button" type="button" data-seek-back aria-label="Назад на 10 секунд">◀</button>
                                                <button class="track-player__button track-player__button--main" type="button" data-player-toggle aria-label="Пуск">▶</button>
                                                <button class="track-player__button" type="button" data-seek-forward aria-label="Вперед на 10 секунд">▶</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="track-player__reel track-player__reel--right">
                                        <img src="${PLAYER_ASSETS.reelRight}" alt="" draggable="false">
                                    </div>
                                </div>
                                <div class="track-player__panel">
                                    <div class="track-player__start">
                                        <button class="track-player__power" type="button" data-player-toggle-mini aria-label="Пуск">
                                            <span aria-hidden="true"></span>
                                        </button>
                                        <span>Пуск</span>
                                    </div>
                                    <label class="track-player__volume">
                                        <span>Громкость</span>
                                        <span class="track-player__knob">
                                            <img src="${PLAYER_ASSETS.volume}" alt="" draggable="false" data-volume-knob>
                                            <input type="range" min="0" max="1" step="0.01" value="${DEFAULT_VOLUME}" data-volume-control aria-label="Громкость">
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");

        if (elements.trackRange) {
            elements.trackRange.textContent = tracks.length > TRACKS_PER_PAGE
                ? `${start + 1}-${end} из ${tracks.length}`
                : `${tracks.length} ${tracks.length === 1 ? "трек" : "треков"}`;
        }

        if (elements.controls) {
            elements.controls.classList.toggle("is-hidden", tracks.length <= TRACKS_PER_PAGE);
        }

        if (elements.prev) {
            elements.prev.disabled = currentPage === 0;
        }

        if (elements.next) {
            elements.next.disabled = currentPage >= totalPages - 1;
        }
    }

    function playTrack(track) {
        const audio = prepareAudio(track);
        const player = track ? track.querySelector(".album-track__player") : null;

        if (!track || !audio || !player) return;

        if (activeAudio && activeAudio !== audio) {
            stopActiveAudio();
        }

        track.classList.add("is-open");
        player.hidden = false;

        activeAudio = audio;
        activeTrack = track;

        audio.play().catch(() => {
            setPlayingUi(track, false);
            player.hidden = false;
        });
    }

    function openTrack(track) {
        const audio = prepareAudio(track);
        const player = track ? track.querySelector(".album-track__player") : null;

        if (!audio || !player) return;

        if (activeTrack === track && track.classList.contains("is-open")) {
            if (audio.paused) {
                playTrack(track);
            } else {
                audio.pause();
            }

            return;
        }

        stopActiveAudio();
        playTrack(track);
    }

    function seekTrack(track, offset) {
        const audio = getTrackAudio(track);

        if (!audio || !Number.isFinite(audio.duration)) return;

        audio.currentTime = clamp(audio.currentTime + offset, 0, audio.duration);
        updateProgressUi(track);
    }

    function setTrackProgress(track, value) {
        const audio = getTrackAudio(track);
        const duration = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

        if (!audio || !duration) return;

        audio.currentTime = duration * (clamp(Number(value) || 0, 0, 1000) / 1000);
        updateProgressUi(track);
    }

    function setTrackVolume(track, value) {
        const audio = prepareAudio(track);

        if (!audio) return;

        audio.muted = false;
        audio.volume = clamp(Number(value) || 0, 0, 1);
        updateVolumeUi(track);
    }

    function bindEvents() {
        if (elements.prev) {
            elements.prev.addEventListener("click", () => {
                currentPage -= 1;
                renderTracks();
            });
        }

        if (elements.next) {
            elements.next.addEventListener("click", () => {
                currentPage += 1;
                renderTracks();
            });
        }

        if (elements.trackList) {
            elements.trackList.addEventListener("click", (event) => {
                const playButton = event.target.closest("[data-play-track]");
                const toggleButton = event.target.closest("[data-player-toggle], [data-player-toggle-mini]");
                const seekBackButton = event.target.closest("[data-seek-back]");
                const seekForwardButton = event.target.closest("[data-seek-forward]");

                if (!playButton && !toggleButton && !seekBackButton && !seekForwardButton) return;

                const track = event.target.closest("[data-track]");

                if (!track) return;

                if (playButton) {
                    openTrack(track);
                    return;
                }

                if (toggleButton) {
                    const audio = prepareAudio(track);

                    if (!audio) return;

                    if (!track.classList.contains("is-open") || audio.paused) {
                        playTrack(track);
                    } else {
                        audio.pause();
                    }

                    return;
                }

                if (seekBackButton) {
                    seekTrack(track, -10);
                    return;
                }

                if (seekForwardButton) {
                    seekTrack(track, 10);
                }
            });

            elements.trackList.addEventListener("input", (event) => {
                const progress = event.target.closest("[data-player-progress]");
                const volume = event.target.closest("[data-volume-control]");

                if (!progress && !volume) return;

                const track = event.target.closest("[data-track]");

                if (!track) return;

                if (progress) {
                    setTrackProgress(track, progress.value);
                }

                if (volume) {
                    setTrackVolume(track, volume.value);
                }
            });

            elements.trackList.addEventListener("loadedmetadata", (event) => {
                const track = event.target.closest("[data-track]");

                updateDurationUi(track);
                updateProgressUi(track);
            }, true);

            elements.trackList.addEventListener("timeupdate", (event) => {
                updateProgressUi(event.target.closest("[data-track]"));
            }, true);

            elements.trackList.addEventListener("volumechange", (event) => {
                updateVolumeUi(event.target.closest("[data-track]"));
            }, true);

            elements.trackList.addEventListener("pause", (event) => {
                setPlayingUi(event.target.closest("[data-track]"), false);
            }, true);

            elements.trackList.addEventListener("play", (event) => {
                const audio = event.target;
                const track = audio.closest("[data-track]");

                if (activeAudio && activeAudio !== audio) {
                    stopActiveAudio();
                }

                activeAudio = audio;
                activeTrack = track;

                if (track) {
                    track.classList.add("is-open");
                    setPlayingUi(track, true);
                }
            }, true);

            elements.trackList.addEventListener("ended", () => {
                stopActiveAudio();
            }, true);
        }
    }

    function renderAlbum() {
        if (!album) {
            renderNotFound();
            return;
        }

        document.title = `${album.title} - Не все дома`;

        if (elements.cover) {
            elements.cover.src = album.cover;
            elements.cover.alt = `Обложка релиза ${album.title}`;
        }

        if (elements.meta) {
            elements.meta.textContent = `${album.type} ${album.year}`;
        }

        if (elements.title) {
            elements.title.textContent = album.title;
        }

        if (elements.description) {
            elements.description.textContent = album.description;
        }

        renderServices();
        renderTracks();
        bindEvents();
    }

    document.addEventListener("DOMContentLoaded", renderAlbum);
})();
