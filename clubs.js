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

let userProfile = null;
let currentClub = "Coding Club"; // Default club jab page khule

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Check Login
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) userProfile = docSnap.data();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// Club Selection Logic (From Right Sidebar)
const clubOptions = document.querySelectorAll('.club-option');
const activeClubTitle = document.getElementById('active-club-title');

clubOptions.forEach(option => {
    option.addEventListener('click', function() {
        // Remove background from all options
        clubOptions.forEach(opt => {
            opt.style.background = "none";
        });
        
        // Add highlight background to clicked one
        this.style.background = "#f0f2f5";
        
        currentClub = this.getAttribute('data-club');
        activeClubTitle.innerText = this.innerText;
        loadClubPosts(); // Naye club ki posts load karo
    });
});

// Create Post in active club (Smart UI)
const postBtn = document.getElementById('club-post-btn');
const postInput = document.getElementById('club-post-input');

postBtn.addEventListener('click', async () => {
    const text = postInput.value.trim();
    
    if (!text || !userProfile) {
        const originalText = postBtn.innerText;
        postBtn.innerText = "⚠️ Write something to post!";
        postBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            postBtn.innerText = originalText;
            postBtn.style.backgroundColor = "#2563eb";
        }, 2000);
        return;
    }

    postBtn.innerText = "Posting...";
    postBtn.disabled = true;

    try {
        await addDoc(collection(db, "club_posts"), {
            clubName: currentClub,
            content: text,
            authorName: userProfile.fullName,
            timestamp: new Date()
        });
        
        postInput.value = "";
        
        postBtn.innerText = "✅ Posted!";
        postBtn.style.backgroundColor = "#10b981";
        setTimeout(() => {
            postBtn.innerText = "Post to Club";
            postBtn.style.backgroundColor = "#2563eb";
            postBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error("Error posting to club:", error);
        postBtn.innerText = "❌ Error";
        postBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            postBtn.innerText = "Post to Club";
            postBtn.style.backgroundColor = "#2563eb";
            postBtn.disabled = false;
        }, 2000);
    }
});

// Load Posts for the active club
const feedContainer = document.getElementById('club-live-posts');
let unsubscribe = null;

function loadClubPosts() {
    const postsQuery = query(collection(db, "club_posts"), orderBy("timestamp", "desc"));
    
    // Agar pehle se koi listener chal raha hai toh use band karo taaki memory leak na ho
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        feedContainer.innerHTML = ""; 
        let postCount = 0;

        snapshot.forEach((docSnapshot) => {
            const postData = docSnapshot.data();
            
            // Sirf current select kiye hue club ki posts dikhao
            if (postData.clubName === currentClub) {
                postCount++;
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <h4>${escapeHTML(postData.authorName)} <span style="font-size: 13px; color: gray;">(${escapeHTML(postData.clubName)})</span></h4>
                    <p style="margin-top: 10px;">${escapeHTML(postData.content)}</p>
                `;
                feedContainer.appendChild(postElement);
            }
        });

        // Agar us club mein ek bhi post nahi hai
        if (postCount === 0) {
            feedContainer.innerHTML = `<p style='color:gray; text-align:center; padding: 20px;'>No discussions in ${currentClub} yet. Be the first to start!</p>`;
        }
    });
}

// Initial load
loadClubPosts();