import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDoc, arrayUnion, arrayRemove, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Analytics CDN Import
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzJgmqfAJldLXuwRLjdHbhRi7Xi0I9WGU",
    authDomain: "campus-socia.firebaseapp.com",
    databaseURL: "https://campus-socia-default-rtdb.firebaseio.com",
    projectId: "campus-socia",
    storageBucket: "campus-socia.firebasestorage.app",
    messagingSenderId: "72432391092",
    appId: "1:72432391092:web:d97a1701b402a0ccf758e1",
    measurementId: "G-BTNMN5KHZL" // Tumhara live Tracking ID
};

// Initialize Firebase Core Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let currentUser = null;

// Check user login status
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // Not logged in? Go back to login
    } else {
        currentUser = user;
    }
});

const saveBtn = document.getElementById('save-btn');
const profileMsg = document.getElementById('profile-msg'); // Naya element

// Message dikhane ka helper function
function showMessage(text, isError = true) {
    profileMsg.innerText = text;
    profileMsg.style.display = "block";
    profileMsg.style.color = isError ? "#e11d48" : "#10b981";
}

saveBtn.addEventListener('click', async function() {
    const name = document.getElementById('name').value.trim();
    const branch = document.getElementById('branch').value.trim();
    const year = document.getElementById('year').value.trim();

    if (!name || !branch || !year) {
        return showMessage("⚠️ Please fill all the details!");
    }

    if (!currentUser) {
        return showMessage("⚠️ Connecting to server... please wait a second and click again.");
    }

    // Button ko disable karo aur text change karo (Double click rokne ke liye)
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving Profile...";
    showMessage("Saving your details...", false);

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            fullName: name,
            branch: branch,
            year: year,
            email: currentUser.email
        });
        
        showMessage("✅ Profile saved successfully! Taking you to campus...", false);
        
        // 1 second ka delay taaki user ko success message dikhe
        setTimeout(() => {
            window.location.href = "dashboard.html"; 
        }, 1000);
        
    } catch (error) {
        showMessage("❌ Error saving profile: " + error.message);
        saveBtn.disabled = false;
        saveBtn.innerText = "Save & Enter Campus";
    }
});