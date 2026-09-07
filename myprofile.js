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
let userProfile = null;

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.href = "index.html";
    else {
        currentUser = user;
        await loadProfileData();
        if (userProfile) {
            loadMyPosts();
        }
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

async function loadProfileData() {
    try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data();
            document.getElementById('profile-name').innerText = userProfile.fullName;
            document.getElementById('profile-details').innerText = `${userProfile.branch} | ${userProfile.year}`;
        } else {
            window.location.href = "profile.html";
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

function loadMyPosts() {
    const myPostsContainer = document.getElementById('my-posts-list');
    
    // Yahan authorId ka filter laga hai
    const q = query(
        collection(db, "campus_posts"), 
        where("authorId", "==", currentUser.uid),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
        myPostsContainer.innerHTML = "";
        if (snapshot.empty) {
            myPostsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>You haven't posted anything yet.</p>";
            return;
        }

        snapshot.forEach((docSnapshot) => {
            const post = docSnapshot.data();
            const postId = docSnapshot.id; 
            
            const postEl = document.createElement('div');
            postEl.className = 'post';
            postEl.innerHTML = `
                <p style="font-size: 16px; margin-top: 0;">${escapeHTML(post.content)}</p>
                <div style="margin-top: 15px; font-size: 13px; color: gray; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 10px;">
                    <span>❤️ ${post.likes || 0} Likes | 💬 ${post.comments ? post.comments.length : 0} Comments</span>
                    <button class="delete-btn" style="background: #e11d48; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">🗑️ Delete</button>
                </div>
            `;
            
            // Delete Logic
            const delBtn = postEl.querySelector('.delete-btn');
            delBtn.addEventListener('click', async () => {
                const isConfirmed = confirm("Are you sure you want to delete this post permanently?");
                if (isConfirmed) {
                    try {
                        delBtn.innerText = "Deleting...";
                        await deleteDoc(doc(db, "campus_posts", postId));
                    } catch (error) {
                        alert("Error deleting post: " + error.message);
                        delBtn.innerText = "🗑️ Delete";
                    }
                }
            });

            myPostsContainer.appendChild(postEl);
        });
    });
}