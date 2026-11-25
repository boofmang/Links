const gameboard = document.getElementById("gameboard");
const feedback = document.getElementById("feedback");
const lastLink = document.getElementById("last-link");
const timer = document.getElementById("timer");
const timerBar = document.getElementById("timer-bar");
const timerMessage = document.getElementById("timer-message");

const ROUND_DURATION = 20000;
const rounds = [
    { answer: "potato", rightWord: "salad" },
    { answer: "dressing", rightWord: "table" },
    { answer: "top", rightWord: "gun" },
    { answer: "dog", rightWord: "bed" },
    { answer: "bugs", rightWord: "bunny" }
];

let currentRound = 0;
let gameIsFinishing = false;
let timerAnimation;
let hintTimeoutId;
let roundTimeoutId;
let countdownIntervalId;

gameboard.addEventListener("submit", (event) => {
    if (!event.target.matches(".word-form")) {
        return;
    }

    event.preventDefault();
    if (gameIsFinishing) {
        return;
    }

    const wordInput = event.target.elements["user-word"];
    feedback.textContent = "try again!";
    const round = rounds[currentRound];

    if (wordInput.value.trim().toLowerCase() !== round.answer) {
        return;
    }

    feedback.textContent = "";
    stopRoundTimer();
    timerMessage.hidden = true;
    timerMessage.textContent = "";

    if (currentRound === rounds.length - 1) {
        finishGame();
        return;
    }

    currentRound += 1;
    lastLink.hidden = currentRound !== rounds.length - 1;
    advanceRound(rounds[currentRound].rightWord);
    startRoundTimer();
});

function advanceRound(nextRightWord) {
    const [leftBox, inputBox, rightBox] = Array.from(gameboard.children);
    const previousRightPosition = rightBox.getBoundingClientRect();
    const boardRect = gameboard.getBoundingClientRect();

    inputBox.querySelectorAll("input, button").forEach((control) => {
        control.disabled = true;
    });
    slideOffscreen(leftBox, boardRect);
    slideOffscreen(inputBox, boardRect);

    rightBox.setAttribute("aria-label", `Left word: ${rightBox.textContent}`);

    const newInputBox = createInputBox(currentRound + 1);
    const newRightBox = document.createElement("div");
    newRightBox.className = "game-box word-box arriving";
    newRightBox.textContent = nextRightWord;
    newRightBox.setAttribute("aria-label", `Right word: ${nextRightWord}`);

    gameboard.append(newInputBox, newRightBox);

    const currentRightPosition = rightBox.getBoundingClientRect();
    rightBox.style.transition = "none";
    rightBox.style.transform = `translate(${previousRightPosition.left - currentRightPosition.left}px, ${previousRightPosition.top - currentRightPosition.top}px)`;
    rightBox.getBoundingClientRect();
    rightBox.style.transition = "";
    rightBox.style.transform = "";

    requestAnimationFrame(() => {
        newInputBox.classList.remove("arriving");
        newRightBox.classList.remove("arriving");
    });
}

function startRoundTimer() {
    stopRoundTimer();
    timerMessage.hidden = true;
    timerMessage.textContent = "";
    timer.setAttribute("aria-valuenow", "20");

    timerAnimation = timerBar.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        { duration: ROUND_DURATION, easing: "linear", fill: "forwards" }
    );

    let secondsRemaining = ROUND_DURATION / 1000;
    countdownIntervalId = window.setInterval(() => {
        secondsRemaining -= 1;
        timer.setAttribute("aria-valuenow", String(secondsRemaining));
        if (secondsRemaining <= 0) {
            window.clearInterval(countdownIntervalId);
            countdownIntervalId = undefined;
        }
    }, 1000);

    hintTimeoutId = window.setTimeout(() => {
        if (!gameIsFinishing) {
            timerMessage.textContent = "HINT:";
            timerMessage.hidden = false;
        }
    }, ROUND_DURATION / 2);
    roundTimeoutId = window.setTimeout(handleRoundTimeout, ROUND_DURATION);
}

function stopRoundTimer() {
    window.clearTimeout(hintTimeoutId);
    window.clearTimeout(roundTimeoutId);
    window.clearInterval(countdownIntervalId);
    hintTimeoutId = undefined;
    roundTimeoutId = undefined;
    countdownIntervalId = undefined;

    if (timerAnimation) {
        timerAnimation.cancel();
        timerAnimation = undefined;
    }

    timer.setAttribute("aria-valuenow", "20");
}

function handleRoundTimeout() {
    roundTimeoutId = undefined;
    window.clearTimeout(hintTimeoutId);
    hintTimeoutId = undefined;
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = undefined;
    timer.setAttribute("aria-valuenow", "0");
    timerMessage.textContent = "too slow!";
    timerMessage.hidden = false;
    gameboard.setAttribute("aria-hidden", "true");
    disableGameControls();

    dissolveGameboard(() => {
        if (currentRound === rounds.length - 1) {
            gameIsFinishing = true;
            lastLink.hidden = true;
            timerMessage.hidden = true;
            showGameEnd("too slow!");
            return;
        }

        currentRound += 1;
        lastLink.hidden = currentRound !== rounds.length - 1;
        renderRound(currentRound);
        gameboard.removeAttribute("aria-hidden");

        const reveal = gameboard.animate(
            [
                { opacity: 0, filter: "blur(12px)", transform: "scale(0.96)" },
                { opacity: 1, filter: "blur(0px)", transform: "scale(1)" }
            ],
            { duration: 500, easing: "ease", fill: "both" }
        );
        reveal.onfinish = () => {
            reveal.cancel();
            startRoundTimer();
        };
    });
}

function renderRound(roundIndex) {
    const leftWord = rounds[roundIndex - 1].rightWord;
    const rightWord = rounds[roundIndex].rightWord;

    gameboard.replaceChildren(
        createWordBox(leftWord, "Left"),
        createInputBox(roundIndex + 1),
        createWordBox(rightWord, "Right")
    );
}

function createWordBox(word, side) {
    const box = document.createElement("div");
    box.className = "game-box word-box";
    box.textContent = word;
    box.setAttribute("aria-label", `${side} word: ${word}`);
    return box;
}

function finishGame() {
    gameIsFinishing = true;
    lastLink.hidden = true;
    timer.hidden = true;
    timerMessage.hidden = true;
    gameboard.setAttribute("aria-hidden", "true");
    disableGameControls();
    dissolveGameboard(() => showGameEnd("You did it!"));
}

function dissolveGameboard(onFinish) {
    const dissolve = gameboard.animate(
        [
            { opacity: 1, filter: "blur(0px)", transform: "scale(1)" },
            { opacity: 0, filter: "blur(12px)", transform: "scale(0.96)" }
        ],
        { duration: 700, easing: "ease", fill: "forwards" }
    );
    dissolve.onfinish = () => {
        dissolve.cancel();
        onFinish();
    };
}

function disableGameControls() {
    gameboard.querySelectorAll("input, button").forEach((control) => {
        control.disabled = true;
    });
}

function showGameEnd(message) {
    const endMessage = document.createElement("div");
    endMessage.className = "game-complete";
    endMessage.setAttribute("role", "status");
    endMessage.textContent = message;
    gameboard.replaceWith(endMessage);
}

function slideOffscreen(box, boardRect) {
    const boxRect = box.getBoundingClientRect();

    box.style.position = "absolute";
    box.style.left = `${boxRect.left - boardRect.left - gameboard.clientLeft}px`;
    box.style.top = `${boxRect.top - boardRect.top - gameboard.clientTop}px`;
    box.style.width = `${boxRect.width}px`;
    box.style.height = `${boxRect.height}px`;
    box.style.boxSizing = "border-box";
    box.animate(
        [
            { transform: "translateX(0)", opacity: 1 },
            { transform: "translateX(-110vw)", opacity: 0 }
        ],
        { duration: 350, easing: "ease-in", fill: "forwards" }
    ).onfinish = () => box.remove();
}

function createInputBox(roundNumber) {
    const box = document.createElement("div");
    box.className = "game-box input-box arriving";

    const form = document.createElement("form");
    form.className = "word-form";

    const label = document.createElement("label");
    label.htmlFor = `user-word-round-${roundNumber}`;
    label.textContent = "Your word";

    const input = document.createElement("input");
    input.id = `user-word-round-${roundNumber}`;
    input.name = "user-word";
    input.type = "text";
    input.placeholder = "Enter a word";

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Submit";

    form.append(label, input, button);
    box.append(form);
    return box;
}

startRoundTimer();
