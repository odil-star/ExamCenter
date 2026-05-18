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
    testsSection: document.getElementById("testsSection"),
    testsList: document.getElementById("testsList"),
    refreshTests: document.getElementById("refreshTests"),
    blocksSection: document.getElementById("blocksSection"),
    testTitle: document.getElementById("testTitle"),
    testDescription: document.getElementById("testDescription"),
    blocksList: document.getElementById("blocksList"),
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

function renderUser() {
    if (!state.user?.is_authenticated) {
        els.userPanel.innerHTML = "";
        els.logoutButton.classList.add("hidden");
        els.mobileLogoutButton.classList.add("hidden");
        closeMobileMenu();
        return;
    }

    els.userPanel.innerHTML = `
        <span class="user-name">${escapeHtml(state.user.username)}</span>
    `;
    els.logoutButton.classList.remove("hidden");
    els.mobileLogoutButton.classList.remove("hidden");
}

async function loadTests() {
    try {
        setLoading(true);
        exitTestMode();
        closeMobileMenu();
        const tests = await api.tests();
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
        const feedback = await api.checkAnswer(state.currentBlock.id, questionId, answerId);
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
        state.user = await api.login(form.get("username"), form.get("password"));
        renderUser();
        showMessage("Вход выполнен.", "success");
        await loadTests();
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(false);
    }
});

els.logoutButton.addEventListener("click", logoutUser);
els.mobileLogoutButton.addEventListener("click", logoutUser);

els.refreshTests.addEventListener("click", loadTests);
els.backToTests.addEventListener("click", () => {
    exitTestMode();
    showOnly(els.testsSection);
});
els.backToBlocks.addEventListener("click", () => {
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
        showMessage(error.message);
        showOnly(els.loginSection);
    } finally {
        setLoading(false);
    }
})();
