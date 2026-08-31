import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzJgmqfAJldLXuwRLjdHbhRi7Xi0I9WGU",
    authDomain: "campus-socia.firebaseapp.com",
    projectId: "campus-socia",
    storageBucket: "campus-socia.firebasestorage.app",
    messagingSenderId: "72432391692",
    appId: "1:72432391692:web:d97a1701b482a0ccf758e1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authMsg = document.getElementById('auth-msg'); // Naya Message element

// Helper function to show messages
function showMessage(text, isError = true) {
    authMsg.innerText = text;
    authMsg.style.display = 'block';
    authMsg.style.color = isError ? '#e11d48' : '#10b981';
}

function setButtonsState(disabled, text1, text2) {
    loginBtn.disabled = disabled;
    signupBtn.disabled = disabled;
    if (text1) loginBtn.innerText = text1;
    if (text2) signupBtn.innerText = text2;
}

// NAYA ACCOUNT BANANE KE LIYE (SIGN UP)
signupBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    authMsg.style.display = 'none'; // Clear old message

    if (!email || !password) {
        return showMessage("Please enter both email and password!");
    }
    if (password.length < 6) {
        return showMessage("Password should be at least 6 characters.");
    }

    setButtonsState(true, "Wait...", "Creating...");

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
          showMessage("Account created! Redirecting...", false);
          setTimeout(() => {
              window.location.href = "profile.html"; 
          }, 1000);
      })
      .catch((error) => {
          showMessage("Sign Up Error: " + error.message.replace("Firebase: ", ""));
          setButtonsState(false, "Login", "Sign Up");
      });
});

// PURANE ACCOUNT SE LOGIN KARNE KE LIYE (LOGIN)
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    authMsg.style.display = 'none'; // Clear old message

    if (!email || !password) {
        return showMessage("Please enter both email and password!");
    }

    setButtonsState(true, "Logging in...", "Wait...");

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
          showMessage("Login successful! Redirecting...", false);
          setTimeout(() => {
              window.location.href = "dashboard.html";
          }, 1000);
      })
      .catch((error) => {
          showMessage("Login Error: Incorrect email or password.");
          setButtonsState(false, "Login", "Sign Up");
      });
});