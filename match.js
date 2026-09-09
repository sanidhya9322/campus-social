import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDoc, arrayUnion, arrayRemove, setDoc,getDocs, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else currentUser = user;
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

const matchBtn = document.getElementById('find-match-btn');
const matchResult = document.getElementById('match-result');

matchBtn.addEventListener('click', async () => {
    matchBtn.innerText = "🎲 Searching campus...";
    matchBtn.disabled = true;
    
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        let otherUsers = [];
        
        // Tumhare alawa baaki sabko list mein daalo
        usersSnapshot.forEach((doc) => {
            if (doc.id !== currentUser.uid) {
                otherUsers.push(doc.data());
            }
        });
        
        if (otherUsers.length === 0) {
            matchResult.innerHTML = "<p style='text-align:center; color:gray; padding: 20px;'>You are the only one on the platform right now! Tell your friends to join.</p>";
            matchBtn.innerText = "🎲 Try Again Later";
            matchBtn.disabled = false;
            return;
        }
        
        // Random selection formula
        const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        
        // Mailto link for direct contact
        const mailtoLink = `mailto:${escapeHTML(randomUser.email)}?subject=Hey! We matched on Campus Social 🎲`;
        
        // Display result
        matchResult.innerHTML = `
            <div class="post" style="text-align: center; border: 2px dashed #3b82f6; margin-top: 20px; padding: 30px;">
                <h3 style="color: #3b82f6; margin-top: 0;">🎉 You Matched With!</h3>
                <h1 style="margin: 10px 0; color: #1f2937;">${escapeHTML(randomUser.fullName)}</h1>
                <p style="font-size: 16px; color: #555;"><strong>Branch:</strong> ${escapeHTML(randomUser.branch)} | <strong>Year:</strong> ${escapeHTML(randomUser.year)}</p>
                <a href="${mailtoLink}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 25px; border-radius: 6px; margin-top: 15px; font-weight: bold;">Say Hi 👋</a>
            </div>
        `;
        matchBtn.innerText = "🎲 Find Another Match";
        matchBtn.disabled = false;

    } catch (error) {
        console.error("Error finding match:", error);
        matchBtn.innerText = "❌ Error finding match";
        matchBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            matchBtn.innerText = "🎲 Roll the Dice";
            matchBtn.style.backgroundColor = "#3b82f6";
            matchBtn.disabled = false;
        }, 2000);
    }
});