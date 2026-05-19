const state = {
    user: null,
    currentTest: null,
    currentBlock: null,
    currentResult: null,
};

let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let answerFeedback = {};
let isSubmittingTest = false;
let testFinished = false;
let questionTransitionTimer = null;
let previousSectionBeforeProfile = null;

const els = {
    userPanel: document.getElementById("userPanel"),
    logoutButton: document.getElementById("logoutButton"),
    themeToggle: document.getElementById("themeToggle"),
    themeIcon: document.getElementById("themeIcon"),
    mobileThemeToggle: document.getElementById("mobileThemeToggle"),
    mobileThemeIcon: document.getElementById("mobileThemeIcon"),
    burgerBtn: document.getElementById("burgerBtn"),
    mobileMenu: document.getElementById("mobileMenu"),
    mobileLogoutButton: document.getElementById("mobileLogoutButton"),
    loading: document.getElementById("loading"),
    loginSection: document.getElementById("loginSection"),
    loginForm: document.getElementById("loginForm"),
    profileSection: document.getElementById("profileSection"),
    profileAvatar: document.getElementById("profileAvatar"),
    profileTitle: document.getElementById("profileTitle"),
    profileInfo: document.getElementById("profileInfo"),
    profileForm: document.getElementById("profileForm"),
    backFromProfile: document.getElementById("backFromProfile"),
    testsSection: document.getElementById("testsSection"),
    testsList: document.getElementById("testsList"),
    refreshTests: document.getElementById("refreshTests"),
    leaderboardList: document.getElementById("leaderboardList"),
    refreshLeaderboard: document.getElementById("refreshLeaderboard"),
    blocksSection: document.getElementById("blocksSection"),
    testTitle: document.getElementById("testTitle"),
    testDescription: document.getElementById("testDescription"),
    blocksList: document.getElementById("blocksList"),
    randomBlockButton: document.getElementById("randomBlockButton"),
    backToTests: document.getElementById("backToTests"),
    quizSection: document.getElementById("quizSection"),
    blockTitle: document.getElementById("blockTitle"),
    progressText: document.getElementById("progressText"),
    progressPercent: document.getElementById("progressPercent"),
    progressFill: document.getElementById("progressFill"),
    quizForm: document.getElementById("quizForm"),
    backToBlocks: document.getElementById("backToBlocks"),
    resultSection: document.getElementById("resultSection"),
    resultText: document.getElementById("resultText"),
    resultPercent: document.getElementById("resultPercent"),
    showAnswersBtn: document.getElementById("showAnswersBtn"),
    resultBackToBlocks: document.getElementById("resultBackToBlocks"),
    message: document.getElementById("message"),
};

els.quizForm.addEventListener("submit", (event) => {
    event.preventDefault();
});

function shuffleArray(array) {
    const copied = [...array];

    for (let i = copied.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copied[i], copied[j]] = [copied[j], copied[i]];
    }

    return copied;
}

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
    updateThemeButton(els.themeToggle, els.themeIcon, isDark);
    updateThemeButton(els.mobileThemeToggle, els.mobileThemeIcon, isDark);
}

function updateThemeButton(button, icon, isDark) {
    if (!button || !icon) {
        return;
    }

    icon.src = isDark ? "img/sun.png" : "img/moon.png";
    icon.alt = isDark ? "Светлая тема" : "Темная тема";
    button.setAttribute(
        "aria-label",
        isDark ? "Включить светлую тему" : "Включить темную тему",
    );
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

els.themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
});

els.mobileThemeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
});

function toggleMobileMenu() {
    els.burgerBtn.classList.toggle("active");
    els.mobileMenu.classList.toggle("active");
}

function closeMobileMenu() {
    els.burgerBtn.classList.remove("active");
    els.mobileMenu.classList.remove("active");
}

els.burgerBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMobileMenu();
});

els.mobileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
});

document.addEventListener("click", () => {
    if (els.mobileMenu.classList.contains("active")) {
        closeMobileMenu();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeMobileMenu();
    }
});

function setLoading(isLoading) {
    els.loading.classList.toggle("hidden", !isLoading);
}

function enterTestMode() {
    document.body.classList.add("test-mode");
}

function exitTestMode() {
    document.body.classList.remove("test-mode");
    clearQuestionTransitionTimer();
}

function clearQuestionTransitionTimer() {
    if (questionTransitionTimer) {
        clearTimeout(questionTransitionTimer);
        questionTransitionTimer = null;
    }
}

function isRandomTest() {
    return Boolean(state.currentBlock?.isRandom);
}

function resetCurrentTest() {
    exitTestMode();
    state.currentBlock = null;
    state.currentResult = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
    answerFeedback = {};
    isSubmittingTest = false;
    testFinished = false;
    els.quizForm.innerHTML = "";
    els.progressText.textContent = "";
    els.progressPercent.textContent = "0%";
    els.progressFill.style.width = "0%";
    els.resultText.textContent = "";
    els.resultPercent.innerHTML = "";
    els.showAnswersBtn.classList.add("hidden");
}

function showOnly(section) {
    [
        els.loginSection,
        els.profileSection,
        els.testsSection,
        els.blocksSection,
        els.quizSection,
        els.resultSection,
    ].forEach((item) => item.classList.add("hidden"));
    section.classList.remove("hidden");
}

function showMessage(text, type = "error") {
    els.message.textContent = text;
    els.message.className = `message ${type === "success" ? "success" : ""}`;
    setTimeout(() => els.message.classList.add("hidden"), 3500);
}

function isBackendUnavailableError(error) {
    return error?.message?.includes("Сервер пока не подключен");
}

function showBackendUnavailableScreen() {
    closeMobileMenu();
    exitTestMode();
    els.userPanel.innerHTML = "";
    els.logoutButton.classList.add("hidden");
    els.mobileLogoutButton.classList.add("hidden");
    els.loginSection.innerHTML = `
        <div class="panel-title">
            <span class="eyebrow">Frontend</span>
            <h2>Frontend работает</h2>
            <p class="muted">Backend сервер пока не подключен.</p>
        </div>
        <div class="message-box">
            <p>GitHub Pages запускает только HTML, CSS и JavaScript. Django backend нужно разместить отдельно на Render, Railway или PythonAnywhere.</p>
            <p>После публикации backend замените HTTPS API адрес в <strong>frontend/js/api.js</strong>.</p>
        </div>
    `;
    showOnly(els.loginSection);
}

function showLoginScreen() {
    resetCurrentTest();
    state.user = null;
    state.currentTest = null;
    renderUser();
    showOnly(els.loginSection);
}

function renderUser() {
    if (!state.user?.is_authenticated) {
        els.userPanel.innerHTML = "";
        els.logoutButton.classList.add("hidden");
        els.mobileLogoutButton.classList.add("hidden");
        closeMobileMenu();
        return;
    }

    const displayName = getDisplayName();
    const avatarColor = state.user.avatar_color || "#2563eb";
    els.userPanel.innerHTML = `
        <button id="profileButton" type="button" class="profile-btn">
            <span class="profile-mini-avatar" style="background: ${escapeHtml(avatarColor)}">${escapeHtml(getInitial(displayName))}</span>
            <span class="user-name">${escapeHtml(displayName)}</span>
        </button>
    `;
    document.getElementById("profileButton").addEventListener("click", loadProfile);
    els.logoutButton.classList.remove("hidden");
    els.mobileLogoutButton.classList.remove("hidden");
}

function getDisplayName(user = state.user) {
    return user?.nickname || user?.username || "";
}

function getInitial(value) {
    return (value || "U").trim().charAt(0).toUpperCase();
}

function getVisibleSection() {
    return [
        els.loginSection,
        els.testsSection,
        els.blocksSection,
        els.quizSection,
        els.resultSection,
    ].find((section) => section && !section.classList.contains("hidden"));
}

function updateUserFromProfile(profile) {
    state.user = {
        ...(state.user || {}),
        is_authenticated: true,
        username: profile.username,
        nickname: profile.nickname,
        avatar_color: profile.avatar_color,
    };
}

async function loadTests() {
    try {
        setLoading(true);
        exitTestMode();
        closeMobileMenu();
        const tests = await api.tests();
        await loadLeaderboard();
        els.testsList.innerHTML = tests.map((test) => `
            <article class="card">
                <h3>${escapeHtml(test.title)}</h3>
                <p class="muted">${escapeHtml(test.description || "Описание не указано.")}</p>
                <p class="muted">Блоков: ${test.block_count}</p>
                <button type="button" data-test-id="${test.id}">Открыть блоки</button>
            </article>
        `).join("") || "<p class=\"muted\">Пока нет доступных тестов.</p>";

        els.testsList.querySelectorAll("[data-test-id]").forEach((button) => {
            button.addEventListener("click", () => openTest(button.dataset.testId));
        });

        showOnly(els.testsSection);
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

async function loadLeaderboard() {
    if (!els.leaderboardList) {
        return;
    }

    try {
        const data = await api.leaderboard();
        renderLeaderboard(data?.results || []);
    } catch (error) {
        els.leaderboardList.innerHTML = `
            <div class="leaderboard-empty">
                <p>Не удалось загрузить таблицу лидеров.</p>
            </div>
        `;
    }
}

function renderLeaderboard(results) {
    if (!results.length) {
        els.leaderboardList.innerHTML = `
            <div class="leaderboard-empty">
                <p>Пока нет завершённых тестов.</p>
            </div>
        `;
        return;
    }

    els.leaderboardList.innerHTML = results.map((item) => {
        const percent = Number(item.percent) || 0;
        const rankClass = item.rank <= 3 ? `rank-${item.rank}` : "";
        return `
            <article class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${item.rank}</div>
                <div class="leaderboard-main">
                    <div class="leaderboard-row">
                        <strong>${escapeHtml(item.username)}</strong>
                        <span>${percent}%</span>
                    </div>
                    <div class="leaderboard-score">${item.score}/${item.total} · ${escapeHtml(item.test_title)}</div>
                    <div class="leaderboard-progress">
                        <span style="width: ${Math.max(0, Math.min(percent, 100))}%"></span>
                    </div>
                    <time datetime="${escapeHtml(item.completed_at)}">${formatDate(item.completed_at)}</time>
                </div>
            </article>
        `;
    }).join("");
}

async function loadProfile() {
    try {
        setLoading(true);
        closeMobileMenu();
        previousSectionBeforeProfile = getVisibleSection();
        const profile = await api.profile();
        updateUserFromProfile(profile);
        renderUser();
        renderProfile(profile);
        showOnly(els.profileSection);
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

function renderProfile(profile) {
    const displayName = profile.nickname || profile.username;
    const leaderboardRank = profile.leaderboard_rank ? `#${profile.leaderboard_rank}` : "—";

    els.profileAvatar.textContent = getInitial(displayName);
    els.profileAvatar.style.background = profile.avatar_color || "#2563eb";
    els.profileTitle.textContent = displayName;
    els.profileForm.nickname.value = profile.nickname || "";
    els.profileInfo.innerHTML = `
        <div class="profile-identity">
            <div>
                <span class="muted">Username</span>
                <strong>${escapeHtml(profile.username)}</strong>
            </div>
            <div>
                <span class="muted">Email</span>
                <strong>${escapeHtml(profile.email || "Не указан")}</strong>
            </div>
            <div>
                <span class="muted">Дата регистрации</span>
                <strong>${formatDate(profile.date_joined)}</strong>
            </div>
        </div>
        <div class="profile-stats">
            ${profileStatCard("Пройдено тестов", profile.tests_completed)}
            ${profileStatCard("Лучший результат", `${profile.best_percent}%`)}
            ${profileStatCard("Средний процент", `${profile.average_percent}%`)}
            ${profileStatCard("Место в leaderboard", leaderboardRank)}
        </div>
    `;
}

function profileStatCard(label, value) {
    return `
        <article class="profile-stat-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </article>
    `;
}

function closeProfile() {
    const target = previousSectionBeforeProfile || els.testsSection;
    previousSectionBeforeProfile = null;
    showOnly(target);
}

async function openTest(testId) {
    try {
        setLoading(true);
        exitTestMode();
        closeMobileMenu();
        const test = await api.test(testId);
        state.currentTest = test;
        els.testTitle.textContent = test.title;
        els.testDescription.textContent = test.description || "";
        els.blocksList.innerHTML = test.blocks.map((block) => `
            <article class="card">
                <h3>${escapeHtml(block.title)}</h3>
                <p class="muted">Вопросов: ${block.question_count}</p>
                <button type="button" data-block-id="${block.id}">Пройти блок</button>
            </article>
        `).join("") || "<p class=\"muted\">В этом тесте нет блоков.</p>";

        els.blocksList.querySelectorAll("[data-block-id]").forEach((button) => {
            button.addEventListener("click", () => startBlockTest(button.dataset.blockId));
        });

        showOnly(els.blocksSection);
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

async function startBlockTest(blockId) {
    try {
        setLoading(true);
        clearQuestionTransitionTimer();
        const block = await api.block(blockId);
        state.currentBlock = block;
        state.currentResult = null;
        currentQuestions = block.questions.map((question) => ({
            ...question,
            shuffledAnswers: shuffleArray(question.answers),
        }));
        currentQuestionIndex = 0;
        userAnswers = [];
        answerFeedback = {};
        isSubmittingTest = false;
        testFinished = false;

        els.blockTitle.textContent = block.title;
        els.showAnswersBtn.classList.add("hidden");
        enterTestMode();
        renderCurrentQuestion();
        showOnly(els.quizSection);
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

async function startRandomTestFromCurrentTest() {
    try {
        setLoading(true);
        clearQuestionTransitionTimer();
        closeMobileMenu();

        const testId = state.currentTest.id;
        const block = await api.randomBlock(testId, 50);

        if (!block.questions.length) {
            showMessage("В этом тесте пока нет доступных вопросов.");
            return;
        }

        state.currentBlock = {
            id: block.id,
            title: block.title,
            isRandom: true,
            testId: block.test_id,
        };

        currentQuestions = block.questions.map((question) => ({
            ...question,
            shuffledAnswers: shuffleArray(question.answers),
        }));

        currentQuestionIndex = 0;
        userAnswers = [];
        answerFeedback = {};
        isSubmittingTest = false;
        testFinished = false;
        state.currentResult = null;

        els.blockTitle.textContent = block.title;
        els.showAnswersBtn.classList.add("hidden");
        enterTestMode();
        renderCurrentQuestion();
        showOnly(els.quizSection);
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

function renderCurrentQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    if (!question) {
        els.quizForm.innerHTML = "<p class=\"muted\">В этом блоке нет вопросов.</p>";
        return;
    }

    const total = currentQuestions.length;
    const questionNumber = currentQuestionIndex + 1;
    const percent = Math.round((questionNumber / total) * 100);
    const selected = userAnswers.find((item) => item.question_id === question.id);
    const feedback = answerFeedback[question.id];
    const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;

    els.progressText.textContent = `Вопрос ${questionNumber} из ${total}`;
    els.progressPercent.textContent = `${percent}%`;
    els.progressFill.style.width = `${percent}%`;

    els.quizForm.innerHTML = `
        <article class="question one-question-card">
            <h3 class="question-title">${escapeHtml(question.text)}</h3>
            <div class="answers-list">
                ${question.shuffledAnswers.map((answer) => {
                    const checked = selected && selected.answer_id === answer.id;
                    const isSelectedWrong = feedback && feedback.selected_answer_id === answer.id && !feedback.is_correct;
                    const isCorrect = feedback && feedback.correct_answer_id === answer.id;
                    const statusClass = isCorrect ? "correct" : isSelectedWrong ? "wrong" : "";
                    return `
                        <label class="answer answer-card ${checked ? "selected" : ""} ${statusClass}">
                            <input
                                type="radio"
                                name="question_${question.id}"
                                value="${answer.id}"
                                ${checked ? "checked" : ""}
                                ${feedback ? "disabled" : ""}
                            >
                            <span>${escapeHtml(answer.text)}</span>
                        </label>
                    `;
                }).join("")}
            </div>
            <div class="quiz-actions ${feedback && isLastQuestion ? "" : "hidden"}">
                <button id="resultButton" type="button">К результатам</button>
            </div>
        </article>
    `;

    els.quizForm.querySelectorAll("input[type='radio']").forEach((input) => {
        input.addEventListener("change", () => {
            handleAnswerSelection(question.id, Number(input.value));
        });
    });

    const resultButton = document.getElementById("resultButton");
    if (resultButton) {
        resultButton.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await submitCurrentTest(event);
        });
    }
}

async function handleAnswerSelection(questionId, answerId) {
    if (answerFeedback[questionId]) {
        return;
    }

    clearQuestionTransitionTimer();
    selectAnswer(questionId, answerId);
    updateSelectedAnswer();
    lockCurrentAnswers(true);

    try {
        const feedback = isRandomTest()
            ? await api.checkRandomAnswer(questionId, answerId)
            : await api.checkAnswer(state.currentBlock.id, questionId, answerId);
        answerFeedback[questionId] = feedback;
        renderCurrentQuestion();

        if (currentQuestionIndex < currentQuestions.length - 1) {
            questionTransitionTimer = setTimeout(() => {
                questionTransitionTimer = null;
                currentQuestionIndex += 1;
                renderCurrentQuestion();
            }, 1000);
        }
    } catch (error) {
        lockCurrentAnswers(false);
        showMessage(error.message);
    }
}

function updateSelectedAnswer() {
    els.quizForm.querySelectorAll(".answer-card").forEach((label) => {
        const input = label.querySelector("input");
        label.classList.toggle("selected", input.checked);
    });
}

function lockCurrentAnswers(isLocked) {
    els.quizForm.querySelectorAll("input[type='radio']").forEach((input) => {
        input.disabled = isLocked;
    });
}

function selectAnswer(questionId, answerId) {
    const existingAnswer = userAnswers.find((answer) => answer.question_id === questionId);
    if (existingAnswer) {
        existingAnswer.answer_id = answerId;
        return;
    }

    userAnswers.push({
        question_id: questionId,
        answer_id: answerId,
    });
}

async function submitCurrentTest(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (isSubmittingTest) {
        return;
    }

    clearQuestionTransitionTimer();

    if (!currentQuestions.every((question) => userAnswers.some((answer) => answer.question_id === question.id))) {
        showMessage("Ответьте на все вопросы.");
        return;
    }

    try {
        isSubmittingTest = true;
        testFinished = true;
        setLoading(true);
        if (isRandomTest()) {
            const submitResult = await api.submitRandomTest(userAnswers);
            renderResult({
                ...submitResult,
                block_title: `${state.currentTest?.title || ""} · Случайный тест`,
            });
            enterTestMode();
            showOnly(els.resultSection);
            return;
        }

        const submitResult = await api.submitBlock(state.currentBlock.id, userAnswers);
        window.location.hash = `result-${submitResult.result_id}`;
        await openResultPage(submitResult.result_id);
    } catch (error) {
        isSubmittingTest = false;
        testFinished = false;
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

async function openResultPage(resultId) {
    clearQuestionTransitionTimer();
    setLoading(true);

    try {
        const resultDetail = await api.result(resultId);
        renderResult(resultDetail);
        enterTestMode();
        showOnly(els.resultSection);
    } finally {
        setLoading(false);
    }
}

function renderResult(result) {
    const score = Number(result.score) || 0;
    const total = Number(result.total) || 0;
    const percent = Number(result.percent) || 0;
    const wrong = Math.max(total - score, 0);
    state.currentResult = result;

    els.resultText.textContent = "Тест завершен";
    els.resultPercent.className = "result-percent result-summary";
    els.resultPercent.innerHTML = `
        <span class="result-block-title">${escapeHtml(result.block_title || state.currentBlock?.title || "")}</span>
        <span class="result-summary-row success">
            <span>Правильных ответов:</span>
            <strong>${score}</strong>
        </span>
        <span class="result-summary-row danger">
            <span>Неправильных ответов:</span>
            <strong>${wrong}</strong>
        </span>
        <span class="result-summary-row">
            <span>Всего вопросов:</span>
            <strong>${total}</strong>
        </span>
        <span class="result-summary-row primary">
            <span>Процент:</span>
            <strong>${percent}%</strong>
        </span>
    `;
    els.showAnswersBtn.classList.remove("hidden");
    els.resultBackToBlocks.textContent = "На главную";
}

function showMyAnswers() {
    if (!state.currentResult || els.resultPercent.querySelector(".answers-review")) {
        return;
    }

    const html = state.currentResult.answers.map((answer, index) => `
        <article class="review-card ${answer.is_correct ? "correct" : "wrong"}">
            <h3>${index + 1}. ${escapeHtml(answer.question)}</h3>
            <p>Ваш ответ: ${escapeHtml(answer.selected_answer || "Нет ответа")}</p>
            <p>Правильный ответ: ${escapeHtml(answer.correct_answer || "Не найден")}</p>
            <strong>${answer.is_correct ? "Правильно" : "Неправильно"}</strong>
        </article>
    `).join("");

    els.resultPercent.insertAdjacentHTML("beforeend", `
        <div class="answers-review">
            ${html}
        </div>
    `);
}

function goHome() {
    window.location.hash = "";
    document.body.classList.remove("test-mode");
    clearQuestionTransitionTimer();
    state.currentBlock = null;
    state.currentResult = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
    answerFeedback = {};
    isSubmittingTest = false;
    testFinished = false;
    els.quizForm.innerHTML = "";
    els.progressText.textContent = "";
    els.progressPercent.textContent = "0%";
    els.progressFill.style.width = "0%";
    els.resultText.textContent = "";
    els.resultPercent.innerHTML = "";
    els.showAnswersBtn.classList.add("hidden");
    loadTests();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

async function logoutUser() {
    try {
        setLoading(true);
        resetCurrentTest();
        await api.logout();
        state.user = null;
        renderUser();
        showOnly(els.loginSection);
        showMessage("Вы вышли из системы.", "success");
        closeMobileMenu();
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
}

els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(els.loginForm);
    try {
        setLoading(true);
        state.user = {
            ...(await api.login(form.get("username"), form.get("password"))),
            is_authenticated: true,
        };
        renderUser();
        showMessage("Вход выполнен.", "success");
        await loadTests();
    } catch (error) {
        if (isBackendUnavailableError(error)) {
            showBackendUnavailableScreen();
            return;
        }

        showMessage(error.message);
    } finally {
        setLoading(false);
    }
});

els.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(els.profileForm);

    try {
        setLoading(true);
        const profile = await api.updateProfile({
            nickname: form.get("nickname"),
        });
        updateUserFromProfile(profile);
        renderUser();
        renderProfile(profile);
        await loadLeaderboard();
        showMessage("Профиль сохранён.", "success");
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
});

els.logoutButton.addEventListener("click", logoutUser);
els.mobileLogoutButton.addEventListener("click", logoutUser);

window.addEventListener("api:unauthorized", () => {
    showLoginScreen();
});

els.refreshTests.addEventListener("click", loadTests);
els.refreshLeaderboard.addEventListener("click", loadLeaderboard);
els.backFromProfile.addEventListener("click", closeProfile);
els.randomBlockButton.addEventListener("click", startRandomTestFromCurrentTest);
els.backToTests.addEventListener("click", () => {
    exitTestMode();
    showOnly(els.testsSection);
});
els.backToBlocks.addEventListener("click", () => {
    if (isRandomTest()) {
        goHome();
        return;
    }

    resetCurrentTest();
    showOnly(els.blocksSection);
});
els.showAnswersBtn.addEventListener("click", showMyAnswers);
els.resultBackToBlocks.addEventListener("click", goHome);

window.addEventListener("hashchange", async () => {
    const hash = window.location.hash;

    if (hash.startsWith("#result-")) {
        const resultId = hash.replace("#result-", "");
        await openResultPage(resultId);
    }
});

(async function init() {
    try {
        setLoading(true);
        state.user = await api.me();
        renderUser();
        if (state.user.is_authenticated) {
            const hash = window.location.hash;

            if (hash.startsWith("#result-")) {
                const resultId = hash.replace("#result-", "");
                await openResultPage(resultId);
                return;
            }

            await loadTests();
        } else {
            showOnly(els.loginSection);
        }
    } catch (error) {
        if (isBackendUnavailableError(error)) {
            showBackendUnavailableScreen();
            return;
        }

        showMessage(error.message);
        showOnly(els.loginSection);
    } finally {
        setLoading(false);
    }
})();
