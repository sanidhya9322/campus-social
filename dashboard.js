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

// Tumhara existing logic yahan se continue hoga...
const postForm = document.getElementById('create-post-form'); 
const postInput = document.getElementById('post-input');
const feedContainer = document.getElementById('live-posts');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let userProfile = null;

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 1. Check Login
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; 
    } else {
        currentUser = user;
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data(); 
        } else {
            window.location.href = "profile.html"; 
        }
    }
});

// 2. Logout
logoutBtn.addEventListener('click', function() {
    signOut(auth).then(() => window.location.href = "index.html");
});

// 3. Create Post
postForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const text = postInput.value;
    if (text.trim() === "" || !userProfile) return;

    const btn = postForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Posting...";

    try {
        await addDoc(collection(db, "campus_posts"), {
            content: text,
            authorId: currentUser.uid, 
            authorName: userProfile.fullName,
            authorBranch: userProfile.branch,
            authorYear: userProfile.year,
            likes: 0,
            likedBy: [], // NAYA LOGIC: Empty array initialize kiya
            comments: [], 
            timestamp: new Date()
        });
        postInput.value = ""; 
    } catch (error) {
        alert("Error saving post: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Post";
    }
});

// 4. Live Feed with New Like Logic
const postsQuery = query(collection(db, "campus_posts"), orderBy("timestamp", "desc"));

onSnapshot(postsQuery, (snapshot) => {
    feedContainer.innerHTML = ""; 
    
    snapshot.forEach((docSnapshot) => {
        const postData = docSnapshot.data();
        const postId = docSnapshot.id; 
        
        const postElement = document.createElement('div');
        postElement.className = 'post';
        
        const displayName = postData.authorName || postData.author || "Anonymous Student";
        const displayBadge = postData.authorBranch ? `${postData.authorBranch}, ${postData.authorYear}` : "Student";

        const commentsList = postData.comments || [];
        let commentsHTML = '';
        
        const displayLimit = 15;
        const visibleComments = commentsList.slice(0, displayLimit);
        
        visibleComments.forEach(comment => {
            commentsHTML += `
                <div style="background: #f8f9fa; padding: 6px 10px; margin-top: 5px; border-radius: 6px; font-size: 14px;">
                    <strong style="color: #333;">${escapeHTML(comment.authorName)}</strong>: ${escapeHTML(comment.text)}
                </div>
            `;
        });

        if (commentsList.length > displayLimit) {
             commentsHTML += `<button style="background: none; border: none; color: #8b5cf6; cursor: pointer; padding: 5px 0; font-size: 13px; font-weight: bold;">View all ${commentsList.length} comments...</button>`;
        }

        // Check if current user has already liked the post
        const likedBy = postData.likedBy || [];
        const isLiked = currentUser && likedBy.includes(currentUser.uid);
        const heartColor = isLiked ? "red" : "#333";

        postElement.innerHTML = `
            <h4>${escapeHTML(displayName)} <span style="font-size: 13px; color: gray; font-weight: normal;">(${escapeHTML(displayBadge)})</span></h4>
            <p>${escapeHTML(postData.content)}</p>
            
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button class="like-btn" style="background: #f0f2f5; color: ${heartColor}; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ❤️ ${postData.likes || 0}
                </button>
                <button class="toggle-comment-btn" style="background: #f0f2f5; color: #333; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    💬 ${commentsList.length}
                </button>
            </div>

            <div class="comments-section" style="display: none; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                ${commentsHTML}
                <div style="display: flex; margin-top: 10px;">
                    <input type="text" class="comment-input" placeholder="Add a comment..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="comment-btn" style="background: #2563eb; color: white; border: none; padding: 8px 15px; margin-left: 5px; border-radius: 4px; cursor: pointer; font-weight: bold;">Post</button>
                </div>
            </div>
        `;
        
        // Hide/Show Toggle Logic
        const toggleBtn = postElement.querySelector('.toggle-comment-btn');
        const commentsSection = postElement.querySelector('.comments-section');
        
        toggleBtn.addEventListener('click', () => {
            if(commentsSection.style.display === "none") {
                commentsSection.style.display = "block";
            } else {
                commentsSection.style.display = "none";
            }
        });
        
        // --- NAYA LIKE LOGIC ---
        const likeBtn = postElement.querySelector('.like-btn');
        likeBtn.addEventListener('click', async function() {
            if (!currentUser) return;
            
            const postRef = doc(db, "campus_posts", postId);
            
            if (isLiked) {
                // User ne pehle hi like kiya hai -> Unlike karo
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: increment(-1)
                });
            } else {
                // User ne like nahi kiya hai -> Like karo
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likes: increment(1)
                });
            }
        });

        // Comment Button Logic
        const commentBtn = postElement.querySelector('.comment-btn');
        const commentInput = postElement.querySelector('.comment-input');
        
        commentBtn.addEventListener('click', async function() {
            const commentText = commentInput.value;
            if (commentText.trim() === "") return;
            
            await updateDoc(doc(db, "campus_posts", postId), {
                comments: arrayUnion({
                    text: commentText,
                    authorId: currentUser.uid,
                    authorName: userProfile.fullName
                })
            });
            commentInput.value = "";
        });
        
        feedContainer.appendChild(postElement);
    });
});

// --- TRUE DAILY POLL LOGIC ---
// (Baaki ka poll logic same rahega)
function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}_${mm}_${dd}`;
}

const todayString = getTodayDateString();
const pollDocRef = doc(db, "polls", `poll_${todayString}`);

let currentPollData = null;

async function initPoll() {
    const snap = await getDoc(pollDocRef);
    if (!snap.exists()) {
        await setDoc(pollDocRef, {
            question: "Which programming language is best for beginners?", 
            optionA: "Python", 
            optionB: "JavaScript", 
            votesA: 0,
            votesB: 0,
            votedUsers: [] 
        });
    }
}
initPoll();

onSnapshot(pollDocRef, (docSnap) => {
    if (docSnap.exists()) {
        currentPollData = docSnap.data();
        
        document.getElementById('poll-question').innerText = currentPollData.question || "No question set for today.";
        document.getElementById('option-a-text').innerText = currentPollData.optionA || "Option A";
        document.getElementById('option-b-text').innerText = currentPollData.optionB || "Option B";
        
        document.getElementById('count-a').innerText = `${currentPollData.votesA || 0} votes`;
        document.getElementById('count-b').innerText = `${currentPollData.votesB || 0} votes`;
    }
});

async function handleVote(option) {
    if (!currentUser || !currentPollData) return;
    
    const msg = document.getElementById('poll-msg');

    if (currentPollData.votedUsers && currentPollData.votedUsers.includes(currentUser.uid)) {
        msg.innerText = "⚠️ You have already voted today!";
        msg.style.color = "#e11d48";
        msg.style.display = "block";
        return;
    }

    const updateData = {
        votedUsers: arrayUnion(currentUser.uid)
    };
    if (option === 'A') updateData.votesA = increment(1);
    if (option === 'B') updateData.votesB = increment(1);

    await updateDoc(pollDocRef, updateData);
    
    msg.innerText = "✅ Vote cast successfully!";
    msg.style.color = "#10b981";
    msg.style.display = "block";
}

document.getElementById('vote-a-btn').addEventListener('click', () => handleVote('A'));
document.getElementById('vote-b-btn').addEventListener('click', () => handleVote('B'));