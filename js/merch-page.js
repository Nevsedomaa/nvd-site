(function () {
    const products = window.MERCH_DATA || [];
    const config = window.ORDER_CONFIG || {};
    const timers = new WeakMap();
    let activeProduct = null;

    const els = {
        grid: document.querySelector("[data-merch-grid]"),
        modal: document.querySelector("[data-order-modal]"),
        close: document.querySelectorAll("[data-order-close]"),
        form: document.querySelector("[data-order-form]"),
        title: document.querySelector("[data-order-product-title]"),
        price: document.querySelector("[data-order-product-price]"),
        id: document.querySelector("[data-order-product-id]"),
        productName: document.querySelector("[data-order-product-name]"),
        sizeField: document.querySelector("[data-size-field]"),
        name: document.querySelector("[data-order-name]"),
        contact: document.querySelector("[data-order-contact]"),
        size: document.querySelector("[data-order-size]"),
        comment: document.querySelector("[data-order-comment]"),
        policy: document.querySelector("[data-order-policy]"),
        status: document.querySelector("[data-order-status]"),
        submit: document.querySelector("[data-order-submit]")
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function hasSize(product) {
        return !/cd|disc|disk|диск/i.test(`${product.id} ${product.title}`);
    }

    function setError(name, message) {
        const el = document.querySelector(`[data-error-for="${name}"]`);
        if (el) el.textContent = message || "";
    }

    function setStatus(message, type) {
        if (!els.status) return;
        els.status.textContent = message || "";
        els.status.classList.toggle("is-error", type === "error");
        els.status.classList.toggle("is-success", type === "success");
    }

    function clearFormState() {
        ["name", "contact", "size", "policy"].forEach((name) => setError(name, ""));
        setStatus("", "");
    }

    function renderProducts() {
        if (!els.grid) return;

        els.grid.innerHTML = products.map((product) => {
            const image = (product.images && product.images[0]) || "assets/images/logo.png";

            return `
                <article class="merch-product" data-merch-product="${escapeHtml(product.id)}" data-reveal>
                    <div class="merch-product__image-wrap">
                        <img class="merch-product__image" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" draggable="false" data-merch-image>
                    </div>
                    <h2>${escapeHtml(product.title)}</h2>
                    <p class="merch-product__description">${escapeHtml(product.description)}</p>
                    <p class="merch-product__price">${escapeHtml(product.price)}</p>
                    <button class="merch-product__order" type="button" data-order-open="${escapeHtml(product.id)}">Заказать</button>
                </article>
            `;
        }).join("");
    }

    function startHover(card, product) {
        const img = card.querySelector("[data-merch-image]");
        const images = product.images || [];
        let index = 0;
        if (!img || images.length < 2) return;

        window.clearInterval(timers.get(card));
        timers.set(card, window.setInterval(() => {
            index = (index + 1) % images.length;
            img.src = images[index];
        }, 850));
    }

    function stopHover(card, product) {
        const img = card.querySelector("[data-merch-image]");
        const images = product.images || [];
        window.clearInterval(timers.get(card));
        timers.delete(card);
        if (img && images[0]) img.src = images[0];
    }

    function openModal(product) {
        if (!els.modal || !els.form) return;
        activeProduct = product;
        clearFormState();
        els.form.reset();

        if (els.id) els.id.value = product.id;
        if (els.productName) els.productName.value = product.title;
        if (els.title) els.title.textContent = product.title;
        if (els.price) els.price.textContent = product.price;

        if (els.sizeField) els.sizeField.classList.toggle("is-hidden", !hasSize(product));
        if (els.size) {
            els.size.disabled = !hasSize(product);
            els.size.value = "S";
        }

        els.modal.hidden = false;
        document.body.classList.add("order-modal-open");
        if (els.name) els.name.focus();
    }

    function closeModal() {
        if (!els.modal) return;
        els.modal.hidden = true;
        document.body.classList.remove("order-modal-open");
        activeProduct = null;
    }

    function validate() {
        const values = {
            name: (els.name && els.name.value.trim()) || "",
            contact: (els.contact && els.contact.value.trim()) || "",
            size: (els.size && els.size.value) || "",
            comment: (els.comment && els.comment.value.trim()) || "",
            policy: Boolean(els.policy && els.policy.checked)
        };
        let ok = true;
        clearFormState();

        if (values.name.length < 2) {
            setError("name", "Укажите имя.");
            ok = false;
        }
        if (!values.contact || (!values.contact.includes("@") && !values.contact.includes("."))) {
            setError("contact", "Укажите Telegram или email.");
            ok = false;
        }
        if (activeProduct && hasSize(activeProduct) && !values.size) {
            setError("size", "Выберите размер.");
            ok = false;
        }
        if (!values.policy) {
            setError("policy", "Нужно согласие с политикой.");
            ok = false;
        }

        return { ok, values };
    }

    function makePayload(values) {
        return {
            order_id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
            product_id: activeProduct.id,
            product_title: activeProduct.title,
            product_price: activeProduct.price,
            name: values.name,
            contact: values.contact,
            size: hasSize(activeProduct) ? values.size : "",
            comment: values.comment,
            created_at: new Date().toISOString()
        };
    }

    function makeTelegramText(payload) {
        return [
            "Новая заявка на мерч",
            "",
            `Товар: ${payload.product_title}`,
            `Цена: ${payload.product_price}`,
            `Имя: ${payload.name}`,
            `Контакт: ${payload.contact}`,
            payload.size ? `Размер: ${payload.size}` : "",
            payload.comment ? `Комментарий: ${payload.comment}` : "",
            "",
            `Время: ${payload.created_at}`
        ].filter(Boolean).join("\n");
    }

    function isJwtKey(value) {
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || ""));
    }

    function makeSupabaseHeaders(anonKey) {
        const headers = {
            apikey: anonKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        };

        if (isJwtKey(anonKey)) {
            headers.Authorization = `Bearer ${anonKey}`;
        }

        return headers;
    }

    function makeSupabasePayload(payload) {
        const supabase = config.supabase || {};
        const fieldMap = supabase.fieldMap || {};
        const source = {
            ...payload,
            product: `${payload.product_title} (${payload.product_id})`
        };
        const mapped = {};
        const entries = Object.keys(fieldMap).length
            ? Object.entries(fieldMap)
            : Object.keys(payload).map((key) => [key, key]);

        entries.forEach(([sourceKey, targetKey]) => {
            if (!targetKey || !Object.prototype.hasOwnProperty.call(source, sourceKey)) return;
            mapped[targetKey] = source[sourceKey];
        });

        return mapped;
    }

    async function sendTelegram(payload) {
        const telegram = config.telegram || {};

        if (!telegram.botToken || !telegram.chatId) return false;

        const url = ["https://api.telegram.org", `bot${telegram.botToken}`, "sendMessage"].join("/");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: telegram.chatId,
                text: makeTelegramText(payload)
            })
        });

        if (!response.ok) throw new Error("Telegram request failed");
        return true;
    }

    async function sendSupabase(payload) {
        const supabase = config.supabase || {};
        if (!supabase.url || !supabase.anonKey || !supabase.table) return false;
        const supabasePayload = makeSupabasePayload(payload);
        const url = `${supabase.url.replace(/\/$/, "")}/rest/v1/${supabase.table}`;

        const response = await fetch(url, {
            method: "POST",
            headers: makeSupabaseHeaders(supabase.anonKey),
            body: JSON.stringify(supabasePayload)
        });

        if (!response.ok) {
            const details = await response.text();
            console.error("Supabase request failed", {
                status: response.status,
                statusText: response.statusText,
                details,
                payload: supabasePayload
            });
            throw new Error(`Supabase request failed (${response.status}): ${details || response.statusText}`);
        }

        return true;
    }

    async function submitOrder(event) {
        event.preventDefault();
        if (!activeProduct) return;

        const { ok, values } = validate();
        if (!ok) return;

        const payload = makePayload(values);
        if (els.submit) els.submit.disabled = true;
        setStatus("Отправляем заявку...", "");

        try {
            const results = await Promise.all([sendSupabase(payload), sendTelegram(payload)]);
            const sent = results.some(Boolean);
            setStatus(sent ? "Заявка отправлена." : "Заявка заполнена, но отправка пока не подключена.", "success");
            if (sent) window.setTimeout(closeModal, 1200);
        } catch (error) {
            console.error(error);
            setStatus(error.message || "Не удалось отправить заявку. Проверь ключи и подключение.", "error");
        } finally {
            if (els.submit) els.submit.disabled = false;
        }
    }

    function bindEvents() {
        if (els.grid) {
            els.grid.addEventListener("click", (event) => {
                const button = event.target.closest("[data-order-open]");
                if (!button) return;
                const product = products.find((item) => item.id === button.dataset.orderOpen);
                if (product) openModal(product);
            });

            els.grid.addEventListener("mouseenter", (event) => {
                const card = event.target.closest("[data-merch-product]");
                if (!card) return;
                const product = products.find((item) => item.id === card.dataset.merchProduct);
                if (product) startHover(card, product);
            }, true);

            els.grid.addEventListener("mouseleave", (event) => {
                const card = event.target.closest("[data-merch-product]");
                if (!card) return;
                const product = products.find((item) => item.id === card.dataset.merchProduct);
                if (product) stopHover(card, product);
            }, true);
        }

        els.close.forEach((button) => button.addEventListener("click", closeModal));
        if (els.form) els.form.addEventListener("submit", submitOrder);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && els.modal && !els.modal.hidden) closeModal();
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderProducts();
        bindEvents();
    });
})();
