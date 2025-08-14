const email = document.getElementById("email");
const password = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const form = document.getElementById("signupForm");

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function showError(input, message) {
  input.parentElement.querySelector("small").textContent = message;
}

function clearError(input) {
  input.parentElement.querySelector("small").textContent = "";
}

function checkForm() {
  let valid = true;

  if (!validateEmail(email.value.trim())) {
    showError(email, "Enter a valid email");
    valid = false;
  } else {
    clearError(email);
  }

  if (!validatePassword(password.value)) {
    showError(password, "At least 8 chars, 1 uppercase & 1 number");
    valid = false;
  } else {
    clearError(password);
  }

  submitBtn.disabled = !valid;
}

email.addEventListener("input", checkForm);
password.addEventListener("input", checkForm);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Sign In 🎉");
});
