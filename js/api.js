const IS_LOCAL =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

const API_BASE = IS_LOCAL
    ? "http://127.0.0.1:8000/api"
    : "";

let csrfToken = "";

function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.split("=");
        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }
    return "";
}

async function request(path, options = {}) {
    if (!API_BASE) {
        throw new Error("Сервер пока не подключен. Запустите backend или укажите HTTPS API адрес.");
    }

    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});

    if (!(options.body instanceof FormData) && options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    if (method !== "GET") {
        const token = csrfToken || getCookie("csrftoken");
        if (token) {
            headers.set("X-CSRFToken", token);
        }
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        method,
        headers,
        credentials: "include",
        body: options.body instanceof FormData ? options.body : options.body,
    });

    let data = null;
    const text = await response.text();
    if (text) {
        data = JSON.parse(text);
    }

    if (!response.ok) {
        const detail = data?.detail || data?.file?.[0] || "Ошибка запроса";
        throw new Error(detail);
    }

    if (data?.csrf_token) {
        csrfToken = data.csrf_token;
    }

    return data;
}

window.api = {
    me: () => request("/me/"),
    login: (username, password) => request("/login/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    }),
    logout: () => request("/logout/", { method: "POST" }),
    tests: () => request("/tests/"),
    test: (testId) => request(`/tests/${testId}/`),
    blocks: (testId) => request(`/tests/${testId}/blocks/`),
    block: (blockId) => request(`/blocks/${blockId}/`),
    checkAnswer: (blockId, questionId, answerId) => request(`/blocks/${blockId}/check-answer/`, {
        method: "POST",
        body: JSON.stringify({
            question_id: questionId,
            answer_id: answerId,
        }),
    }),
    submitBlock: (blockId, answers) => request(`/blocks/${blockId}/submit/`, {
        method: "POST",
        body: JSON.stringify({ answers }),
    }),
    result: (resultId) => request(`/results/${resultId}/`),
};
