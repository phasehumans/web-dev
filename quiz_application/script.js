// script.js
const questions = [
  {
    question: "What is the capital of France?",
    answers: [
      { text: "Paris", correct: true },
      { text: "London", correct: false },
      { text: "Rome", correct: false },
      { text: "Berlin", correct: false }
    ]
  },
  {
    question: "Who created JavaScript?",
    answers: [
      { text: "Brendan Eich", correct: true },
      { text: "Tim Berners-Lee", correct: false },
      { text: "Dennis Ritchie", correct: false },
      { text: "Guido van Rossum", correct: false }
    ]
  },
  {
    question: "Which planet is known as the Red Planet?",
    answers: [
      { text: "Venus", correct: false },
      { text: "Mars", correct: true },
      { text: "Jupiter", correct: false },
      { text: "Saturn", correct: false }
    ]
  }
];

const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");

let currentQuestionIndex = 0;
let score = 0;

function startQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  nextButton.textContent = "Next";
  showQuestion();
}

function showQuestion() {
  resetState();
  const q = questions[currentQuestionIndex];
  questionElement.textContent = q.question;

  q.answers.forEach(ans => {
    const button = document.createElement("button");
    button.className = "btn";
    button.type = "button";
    button.setAttribute("role","listitem");
    button.textContent = ans.text;
    if (ans.correct) button.dataset.correct = "true";
    button.addEventListener("click", selectAnswer);
    answerButtons.appendChild(button);
  });
}

function resetState() {
  nextButton.style.display = "none";
  while (answerButtons.firstChild) answerButtons.removeChild(answerButtons.firstChild);
}

function selectAnswer(e) {
  const selected = e.currentTarget;
  const correct = selected.dataset.correct === "true";
  if (correct) {
    selected.classList.add("correct");
    score++;
  } else {
    selected.classList.add("wrong");
  }

  // reveal correct answer and disable all
  Array.from(answerButtons.children).forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === "true") btn.classList.add("correct");
  });

  nextButton.style.display = "inline-block";
  nextButton.focus();
}

function showScore() {
  resetState();
  questionElement.textContent = `You scored ${score} out of ${questions.length}!`;
  nextButton.textContent = "Play Again";
  nextButton.style.display = "inline-block";
}

nextButton.addEventListener("click", () => {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  } else if (currentQuestionIndex === questions.length - 1) {
    // last question -> show score on next click
    currentQuestionIndex++;
    showScore();
  } else {
    // play again
    startQuiz();
  }
});

// initialize
startQuiz();
