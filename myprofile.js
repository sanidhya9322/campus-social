import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let currentUser = null;
let userProfile = null;

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

// 🔥 SUPER FUNCTION: Fetch from ALL collections (Feed, Clubs, Marketplace, Gigs, Events)
async function loadMyPosts() {
    const myPostsContainer = document.getElementById('my-posts-list');
    myPostsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>Loading your activity...</p>";

    try {
        // Query all 5 collections simultaneously
        const feedQ = query(collection(db, "campus_posts"), where("authorId", "==", currentUser.uid));
        const clubQ = query(collection(db, "club_posts"), where("authorId", "==", currentUser.uid));
        const marketQ = query(collection(db, "marketplace_items"), where("authorId", "==", currentUser.uid));
        const gigsQ = query(collection(db, "campus_gigs"), where("authorId", "==", currentUser.uid));
        const eventsQ = query(collection(db, "campus_events"), where("authorId", "==", currentUser.uid));

        const [feedSnap, clubSnap, marketSnap, gigsSnap, eventsSnap] = await Promise.all([
            getDocs(feedQ), getDocs(clubQ), getDocs(marketQ), getDocs(gigsQ), getDocs(eventsQ)
        ]);

        let allPosts = [];

        // Combine data with collection tags
        feedSnap.forEach(doc => allPosts.push({ id: doc.id, collectionRef: "campus_posts", postType: "Feed Post", ...doc.data() }));
        clubSnap.forEach(doc => allPosts.push({ id: doc.id, collectionRef: "club_posts", postType: `Club: ${doc.data().clubName || 'Discussion'}`, ...doc.data() }));
        marketSnap.forEach(doc => allPosts.push({ id: doc.id, collectionRef: "marketplace_items", postType: "Marketplace Item", ...doc.data() }));
        gigsSnap.forEach(doc => allPosts.push({ id: doc.id, collectionRef: "campus_gigs", postType: "Campus Gig", ...doc.data() }));
        eventsSnap.forEach(doc => allPosts.push({ id: doc.id, collectionRef: "campus_events", postType: "Campus Event", ...doc.data() }));

        // Sort by newest first
        allPosts.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        myPostsContainer.innerHTML = "";

        if (allPosts.length === 0) {
            myPostsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>You haven't posted anything yet.</p>";
            return;
        }

        allPosts.forEach((post) => {
            const postEl = document.createElement('div');
            postEl.className = 'post modern-card';
            postEl.style.padding = '20px';
            postEl.style.marginBottom = '15px';
            postEl.style.borderBottom = '1px solid var(--border)';
            
            // Handle different content fields dynamically (title, itemName, content, description)
            const postContent = post.content || post.description || post.title || post.itemName || post.gigTitle || "View Post Details";
            const likesCount = post.likes ? post.likes.length : 0;
            const commentsCount = post.comments ? post.comments.length : 0;

            postEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: bold; background: #e0e7ff; color: #3b82f6; padding: 4px 8px; border-radius: 4px;">
                        ${escapeHTML(post.postType)}
                    </span>
                    <button class="delete-btn" style="background: #e11d48; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px;">
                        🗑️ Delete
                    </button>
                </div>
                
                <p style="font-size: 15px; margin-top: 0; color: #333; line-height: 1.5;">${escapeHTML(postContent)}</p>
                
                <div style="margin-top: 15px; font-size: 13px; color: gray; display: flex; justify-content: flex-start; gap: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                    <span>❤️ ${likesCount} Likes</span>
                    <span>💬 ${commentsCount} Comments</span>
                </div>
            `;

            // Smart Delete Logic
            const delBtn = postEl.querySelector('.delete-btn');
            delBtn.addEventListener('click', async () => {
                const isConfirmed = confirm(`Are you sure you want to permanently delete this ${post.postType}?`);
                if (isConfirmed) {
                    try {
                        delBtn.innerText = "Deleting...";
                        await deleteDoc(doc(db, post.collectionRef, post.id));
                        postEl.remove(); 
                    } catch (error) {
                        console.error("Error deleting post:", error);
                        alert("Error deleting post. Make sure you have permission.");
                        delBtn.innerText = "🗑️ Delete";
                    }
                }
            });

            myPostsContainer.appendChild(postEl);
        });
    } catch (error) {
        console.error("Error fetching all posts:", error);
        myPostsContainer.innerHTML = "<p style='color:#e11d48; text-align:center;'>Error loading your activity.</p>";
    }
}