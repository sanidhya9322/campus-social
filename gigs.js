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

// Global State Variables
let currentUser = null;
let userProfile = null;

// Firebase Auth Block
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data();
        }
    }
});

function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

const postBtn = document.getElementById('post-gig-btn');
postBtn.addEventListener('click', async () => {
    const title = document.getElementById('gig-title').value.trim();
    const price = document.getElementById('gig-price').value.trim();

    if (!title || !price || !userProfile || !currentUser) {
        postBtn.innerText = "⚠️ Fill all details!";
        setTimeout(() => postBtn.innerText = "Post Gig & Find Helper", 2000);
        return;
    }

    postBtn.innerText = "Posting...";
    postBtn.disabled = true;

    try {
        await addDoc(collection(db, "campus_gigs"), {
            title: title,
            price: Number(price),
            posterName: userProfile.fullName,
            authorId: currentUser.uid,
            posterEmail: userProfile.email,
            timestamp: new Date()
        });
        
        document.getElementById('gig-title').value = "";
        document.getElementById('gig-price').value = "";
        postBtn.innerText = "✅ Gig Posted!";
    } catch (error) {
        alert("Error posting gig: " + error.message);
    } finally {
        setTimeout(() => {
            postBtn.innerText = "Post Gig & Find Helper";
            postBtn.disabled = false;
        }, 2000);
    }
});

const gigsQuery = query(collection(db, "campus_gigs"), orderBy("timestamp", "desc"));
const gigsContainer = document.getElementById('gigs-list');

onSnapshot(gigsQuery, (snapshot) => {
    gigsContainer.innerHTML = "";
    
    if (snapshot.empty) {
        gigsContainer.innerHTML = "<p style='text-align:center; color:gray;'>No active gigs. Post one and get help!</p>";
        return;
    }
    
    snapshot.forEach((docSnap) => {
        const gig = docSnap.data();
        const gigCard = document.createElement('div');
        gigCard.className = 'post';
        
        const mailtoLink = `mailto:${escapeHTML(gig.posterEmail)}?subject=I can do your gig: ${escapeHTML(gig.title)}`;

        gigCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="margin: 0; color: #1f2937;">${escapeHTML(gig.title)}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: gray;">Posted by: ${escapeHTML(gig.posterName)}</p>
                </div>
                <span style="background: #f59e0b; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    ₹${escapeHTML(String(gig.price))}
                </span>
            </div>
            <a href="${mailtoLink}" style="display: block; text-align: center; text-decoration: none; background: #10b981; color: white; width: 100%; margin-top: 15px; padding: 10px; border-radius: 6px; font-weight: bold; box-sizing: border-box;">
                Accept Gig & Contact
            </a>
        `;
        gigsContainer.appendChild(gigCard);
    });
});