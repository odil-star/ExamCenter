const IS_LOCAL =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

const BACKEND_URL = "https://server-exapmtest.onrender.com";
const API_BASE = IS_LOCAL
    ? "http://127.0.0.1:8000/api"
    : `${BACKEND_URL}/api`;

const TOKEN_STORAGE_KEY = "online_tests_token";

function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        return;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function notifyUnauthorized() {
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
}

async function request(path, options = {}) {
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    const token = getToken();

    if (!(options.body instanceof FormData) && options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Token ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        method,
        headers,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Backend returned HTML instead of JSON:", text);
        throw new Error("Backend вернул HTML вместо JSON. Проверь API endpoint.");
    }

    let data = null;
    const text = await response.text();
    if (text) {
        data = JSON.parse(text);
    }

    if (response.status === 401) {
        setToken("");
        notifyUnauthorized();
    }

    if (!response.ok) {
        const detail = data?.detail || data?.file?.[0] || "Ошибка запроса";
        throw new Error(detail);
    }

    return data;
}

window.api = {
    clearToken: () => setToken(""),
    me: () => request("/me/"),
    login: async (username, password) => {
        console.log("LOGIN REQUEST");
        console.log(username, password);

        const data = await request("/login/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        setToken(data.token);
        return data;
    },
    logout: async () => {
        try {
            return await request("/logout/", { method: "POST" });
        } finally {
            setToken("");
        }
    },
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
