import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzJgmqfAJldLXuwRLjdHbhRi7Xi0I9WGU",
    authDomain: "campus-socia.firebaseapp.com",
    databaseURL: "https://campus-socia-default-rtdb.firebaseio.com",
    projectId: "campus-socia",
    storageBucket: "campus-socia.firebasestorage.app",
    messagingSenderId: "72432391092",
    appId: "1:72432391092:web:d97a1701b402a0ccf758e1",
    measurementId: "G-BTNMN5KHZL"
};

// Initialize Firebase Core Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// 1. Declare currentUser globally before any functions or event listeners
let currentUser = null;

// 2. Strict Firebase Auth Block
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        // [Put initial data loading function here if any]
        // Note: No auto-load functions present on this specific page.
    }
});

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

const matchBtn = document.getElementById('find-match-btn');
const matchResult = document.getElementById('match-result');

matchBtn.addEventListener('click', async () => {
    // 3. This safely relies on the globally scoped currentUser
    if (!currentUser) return;

    matchBtn.innerText = "🎲 Searching campus...";
    matchBtn.disabled = true;
    
    try {
        const usersRef = collection(db, "users");
        
        // Performance Optimization: Restrict fetch to limit full database reads
        const q = query(usersRef, limit(50));
        const usersSnapshot = await getDocs(q);
        
        let otherUsers = [];
        
        // Current user ko exclude karna
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
        
        // Email formats prepare karna
        const userEmail = escapeHTML(randomUser.email || "");
        const fullName = escapeHTML(randomUser.fullName || "Anonymous Student");
        const branch = escapeHTML(randomUser.branch || "N/A");
        const year = escapeHTML(randomUser.year || "N/A");
        const subject = encodeURIComponent("Hey! We matched on Campus Social 🎲");
        
        // Mobile ke liye native app link
        const mailtoLink = `mailto:${userEmail}?subject=${subject}`;
        
        // Desktop ke liye direct Gmail web link
        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${userEmail}&su=${subject}`;
        
        // Display result with dual buttons
        matchResult.innerHTML = `
            <div class="post" style="text-align: center; border: 2px dashed #3b82f6; margin-top: 20px; padding: 30px; border-radius: 12px;">
                <h3 style="color: #3b82f6; margin-top: 0;">🎉 You Matched With!</h3>
                <h1 style="margin: 10px 0; color: #1f2937;">${fullName}</h1>
                <p style="font-size: 16px; color: #555;"><strong>Branch:</strong> ${branch} | <strong>Year:</strong> ${year}</p>
                
                <p style="font-size: 14px; color: gray; margin-bottom: 5px;">${userEmail}</p>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px; flex-wrap: wrap;">
                    <a href="${gmailLink}" target="_blank" style="background: #ea4335; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Gmail Web ✉️</a>
                    
                    <a href="${mailtoLink}" style="background: #10b981; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Email App 📱</a>
                </div>
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