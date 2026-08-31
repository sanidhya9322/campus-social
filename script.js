import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleBtn = document.getElementById('google-login-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authMsg = document.getElementById('auth-msg');

// Helper function to show messages
function showMessage(text, isError = true) {
    authMsg.innerText = text;
    authMsg.style.display = 'block';
    authMsg.style.color = isError ? '#e11d48' : '#10b981';
}

function setButtonsState(disabled, text1, text2) {
    loginBtn.disabled = disabled;
    signupBtn.disabled = disabled;
    if (googleBtn) googleBtn.disabled = disabled;
    if (text1) loginBtn.innerText = text1;
    if (text2) signupBtn.innerText = text2;
}

// SIGN UP
signupBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    authMsg.style.display = 'none';

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

// LOGIN
loginBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    authMsg.style.display = 'none';

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
          showMessage("Login Error: " + error.message.replace("Firebase: ", ""));
          setButtonsState(false, "Login", "Sign Up");
      });
});

// GOOGLE LOGIN
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        authMsg.style.display = 'none';
        setButtonsState(true, "Connecting...", "Connecting...");

        signInWithPopup(auth, provider)
            .then((result) => {
                showMessage("Google login successful! Redirecting...", false);
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            })
            .catch((error) => {
                showMessage("Google Login Error: " + error.message.replace("Firebase: ", ""));
                setButtonsState(false, "Login", "Sign Up");
            });
    });
}