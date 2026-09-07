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

// Check Auth & Load Profile
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data();
        }
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

const trendingContainer = document.getElementById('trending-posts');

// Query: Order strictly by 'likes' instead of time
const trendingQuery = query(collection(db, "campus_posts"), orderBy("likes", "desc"));

onSnapshot(trendingQuery, (snapshot) => {
    trendingContainer.innerHTML = ""; 
    
    snapshot.forEach((docSnapshot) => {
        const postData = docSnapshot.data();
        const postId = docSnapshot.id; 
        
        // Skip posts with 0 likes to keep the trending page exclusive
        if (!postData.likes || postData.likes === 0) return;

        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.style.borderLeft = "4px solid #f43f5e"; // Visual flair for trending items
        
        const displayName = postData.authorName || postData.author || "Anonymous Student";
        const displayBadge = postData.authorBranch ? `${postData.authorBranch}, ${postData.authorYear || ''}` : "Student";

        const commentsList = postData.comments || [];
        let commentsHTML = '';
        
        // Show only the first 15 comments
        const displayLimit = 15;
        const visibleComments = commentsList.slice(0, displayLimit);
        
        visibleComments.forEach(comment => {
            commentsHTML += `
                <div style="background: #fff1f2; padding: 6px 10px; margin-top: 5px; border-radius: 6px; font-size: 14px;">
                    <strong style="color: #333;">${escapeHTML(comment.authorName)}</strong>: ${escapeHTML(comment.text)}
                </div>
            `;
        });

        if (commentsList.length > displayLimit) {
             commentsHTML += `<button style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 5px 0; font-size: 13px; font-weight: bold;">View all ${commentsList.length} comments...</button>`;
        }

        postElement.innerHTML = `
            <h4>${escapeHTML(displayName)} <span style="font-size: 13px; color: gray; font-weight: normal;">(${escapeHTML(displayBadge)})</span></h4>
            <p>${escapeHTML(postData.content)}</p>
            
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button class="like-btn" style="background: #fef1f2; color: #f43f5e; border: 1px solid #fecdd3; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🔥 ${postData.likes} Trending
                </button>
                <button class="toggle-comment-btn" style="background: #f0f2f5; color: #333; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    💬 ${commentsList.length} Comments
                </button>
            </div>

            <!-- Comments Section (Hidden by default) -->
            <div class="comments-section" style="display: none; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                ${commentsHTML}
                <div style="display: flex; margin-top: 10px;">
                    <input type="text" class="comment-input" placeholder="Add a comment..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="comment-btn" style="background: #f43f5e; color: white; border: none; padding: 8px 15px; margin-left: 5px; border-radius: 4px; cursor: pointer; font-weight: bold;">Post</button>
                </div>
            </div>
        `;
        
        // Hide/Show Toggle Logic
        const toggleBtn = postElement.querySelector('.toggle-comment-btn');
        const commentsSection = postElement.querySelector('.comments-section');
        
        toggleBtn.addEventListener('click', () => {
            commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
        });
        
        // Like Button Logic
        const likeBtn = postElement.querySelector('.like-btn');
        likeBtn.addEventListener('click', async function() {
            await updateDoc(doc(db, "campus_posts", postId), {
                likes: increment(1)
            });
        });

        // Comment Button Logic
        const commentBtn = postElement.querySelector('.comment-btn');
        const commentInput = postElement.querySelector('.comment-input');
        
        commentBtn.addEventListener('click', async function() {
            const commentText = commentInput.value;
            if (commentText.trim() === "" || !userProfile) return;
            
            await updateDoc(doc(db, "campus_posts", postId), {
                comments: arrayUnion({
                    text: commentText,
                    authorName: userProfile.fullName
                })
            });
            commentInput.value = "";
        });
        
        trendingContainer.appendChild(postElement);
    });
});