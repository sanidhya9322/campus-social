import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDoc, arrayUnion, arrayRemove, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const postForm = document.getElementById('create-post-form'); 
const postInput = document.getElementById('post-input');
const feedContainer = document.getElementById('live-posts');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let userProfile = null;

function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function canUserPost(postType = 'general') {
    const COOLDOWN_TIME = 60000; 
    const lastPostTime = localStorage.getItem(`last_post_time_${postType}`);
    
    if (lastPostTime && (Date.now() - lastPostTime < COOLDOWN_TIME)) {
        const remainingSeconds = Math.ceil((COOLDOWN_TIME - (Date.now() - lastPostTime)) / 1000);
        alert(`⏳ Hold on! Please wait ${remainingSeconds} seconds before posting again.`);
        return false;
    }
    return true;
}

const adminEmails = [
    "sanidhyapethe@gmail.com", 
    "chaitaliholey6@gmail.com"
];

// 1. Check Login & Admin Setup
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; 
    } else {
        currentUser = user;

        if (adminEmails.includes(user.email)) {
            if (!document.getElementById('admin-nav-btn')) {
                const sidebar = document.querySelector('.sidebar ul');
                if (sidebar) {
                    const adminLi = document.createElement('li');
                    adminLi.id = "admin-nav-btn";
                    adminLi.innerHTML = "🛡️ Admin Panel";
                    adminLi.style.cssText = "color: #e11d48; font-weight: bold; cursor: pointer; border-top: 2px dashed #e11d48; margin-top: 10px; padding-top: 10px; background: transparent;";
                    adminLi.onclick = () => window.location.href = 'admin.html';
                    sidebar.appendChild(adminLi);
                }
            }
        }

        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data(); 
        } else {
            window.location.href = "profile.html"; 
        }
    }
});

logoutBtn.addEventListener('click', function() {
    signOut(auth).then(() => window.location.href = "index.html");
});

// 3. Create Post (REMOVED HARDCODED NAME/BRANCH)
postForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!canUserPost('feed')) return; 

    const text = postInput.value;
    if (text.trim() === "" || !userProfile) return;

    const btn = postForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Posting...";

    try {
        await addDoc(collection(db, "campus_posts"), {
            content: text,
            authorId: currentUser.uid, // 🔴 Only saving ID now
            likes: 0,
            likedBy: [], 
            comments: [], 
            timestamp: new Date()
        });
        postInput.value = ""; 
        localStorage.setItem('last_post_time_feed', Date.now());
    } catch (error) {
        alert("Error saving post: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Post";
    }
});

// 🔴 DYNAMIC CACHE LOGIC: Database reads bachane ke liye
const userCache = {};

async function getFreshUserData(uid) {
    if (!uid) return { fullName: "Anonymous Student", branch: "", year: "" };
    if (userCache[uid]) return userCache[uid]; // Cache se return karo
    
    try {
        const uDoc = await getDoc(doc(db, "users", uid));
        if (uDoc.exists()) {
            userCache[uid] = uDoc.data();
            return userCache[uid];
        }
    } catch (err) {
        console.error("User fetch error:", err);
    }
    return { fullName: "Anonymous Student", branch: "Student", year: "" };
}

// 4. Live Feed with Dynamic Profile Sync
const postsQuery = query(collection(db, "campus_posts"), orderBy("timestamp", "desc"));

onSnapshot(postsQuery, async (snapshot) => {
    // UI Flicker rokne ke liye hum ek fragment banayenge
    const tempContainer = document.createElement('div');
    
    // 🔴 FOR...OF loop use kiya hai taaki async/await sahi se kaam kare
    for (const docSnapshot of snapshot.docs) {
        const postData = docSnapshot.data();
        const postId = docSnapshot.id; 
        
        // POST AUTHOR DETAILS FETCH
        const postAuthorInfo = await getFreshUserData(postData.authorId);
        const displayName = postAuthorInfo.fullName;
        const displayBadge = postAuthorInfo.branch ? `${postAuthorInfo.branch}, ${postAuthorInfo.year}` : "Student";

        const postElement = document.createElement('div');
        postElement.className = 'post';

        const commentsList = postData.comments || [];
        let commentsHTML = '';
        
        const displayLimit = 15;
        const visibleComments = commentsList.slice(0, displayLimit);
        
        // COMMENT AUTHOR DETAILS FETCH & UI RENDER
        for (const comment of visibleComments) {
            const commentAuthorInfo = await getFreshUserData(comment.authorId);
            
            // 🔴 NAYA LOGIC: Check if user owns the comment
            let actionButtons = '';
            if (comment.authorId === currentUser.uid) {
                // We use comment.commentId if it exists, otherwise fallback to timestamp for old comments
                const uniqueCId = comment.commentId || comment.timestamp;
                actionButtons = `
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.editComment('${postId}', '${uniqueCId}', '${escapeHTML(comment.text).replace(/'/g, "\\'")}', 'campus_posts')" style="background:none; border:none; color: #3b82f6; cursor:pointer; font-size:12px; padding:0;">✏️ Edit</button>
                        <button onclick="window.deleteComment('${postId}', '${uniqueCId}', 'campus_posts')" style="background:none; border:none; color: #e11d48; cursor:pointer; font-size:12px; padding:0;">🗑️ Delete</button>
                    </div>
                `;
            }

            commentsHTML += `
                <div style="background: #f8f9fa; padding: 8px 12px; margin-top: 5px; border-radius: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: #333;">${escapeHTML(commentAuthorInfo.fullName)}</strong>: 
                        <span style="color: #4b5563;">${escapeHTML(comment.text)}</span>
                    </div>
                    ${actionButtons}
                </div>
            `;
        }

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
                
                <button onclick="window.reportPost('${doc.id}', 'campus_posts')" style="background: none; border: none; color: #e11d48; cursor: pointer; font-size: 13px; font-weight: bold; margin-left: 15px;">
               ⚠️ Report
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
        
        const toggleBtn = postElement.querySelector('.toggle-comment-btn');
        const commentsSection = postElement.querySelector('.comments-section');
        
        toggleBtn.addEventListener('click', () => {
            if(commentsSection.style.display === "none") {
                commentsSection.style.display = "block";
            } else {
                commentsSection.style.display = "none";
            }
        });
        
        const likeBtn = postElement.querySelector('.like-btn');
        likeBtn.addEventListener('click', async function() {
            if (!currentUser) return;
            const postRef = doc(db, "campus_posts", postId);
            
            if (isLiked) {
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: increment(-1)
                });
            } else {
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likes: increment(1)
                });
            }
        });

      // CREATE COMMENT
        const commentBtn = postElement.querySelector('.comment-btn');
        const commentInput = postElement.querySelector('.comment-input');
        
        commentBtn.addEventListener('click', async function() {
            const commentText = commentInput.value;
            if (commentText.trim() === "") return;
            
            await updateDoc(doc(db, "campus_posts", postId), {
                comments: arrayUnion({
                    commentId: currentUser.uid + '_' + Date.now(), // 🔴 Unique ID added
                    text: commentText,
                    authorId: currentUser.uid, 
                    timestamp: Date.now()
                })
            });
            commentInput.value = "";
        });
        
        tempContainer.appendChild(postElement);
    }
    
    // UI ko ek sath update karna taaki screen na hile
    feedContainer.innerHTML = "";
    feedContainer.appendChild(tempContainer);
});

// --- TRUE DAILY POLL LOGIC ---
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

// Global Report Function
window.reportPost = async (postId, collectionName) => {
    const confirmReport = confirm("Do you want to report this post to the admins?");
    if (!confirmReport) return;

    try {
        await addDoc(collection(db, "reported_content"), {
            reportedPostId: postId,
            reportedFromCollection: collectionName,
            reportedBy: currentUser.uid,
            timestamp: new Date()
        });

        alert("✅ Post reported successfully. Admins will review it.");
    } catch (error) {
        console.error("Error reporting post:", error);
        alert("❌ Could not report the post. Try again.");
    }
};

// 🔴 Global Edit Comment Function
window.editComment = async (postId, commentId, oldText, collectionName) => {
    const newText = prompt("Edit your comment:", oldText);
    if (!newText || newText.trim() === "" || newText === oldText) return;
    
    const postRef = doc(db, collectionName, postId);
    try {
        const snap = await getDoc(postRef);
        if(snap.exists()) {
            const post = snap.data();
            // Find and update the specific comment
            const updatedComments = post.comments.map(c => {
                const currentId = c.commentId || c.timestamp;
                if(currentId.toString() === commentId.toString()) {
                    return { ...c, text: newText.trim() };
                }
                return c;
            });
            await updateDoc(postRef, { comments: updatedComments });
        }
    } catch(e) {
        console.error(e);
        alert("Error editing comment.");
    }
};

// 🔴 Global Delete Comment Function
window.deleteComment = async (postId, commentId, collectionName) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    const postRef = doc(db, collectionName, postId);
    try {
        const snap = await getDoc(postRef);
        if(snap.exists()) {
            const post = snap.data();
            // Filter out the deleted comment
            const updatedComments = post.comments.filter(c => {
                const currentId = c.commentId || c.timestamp;
                return currentId.toString() !== commentId.toString();
            });
            await updateDoc(postRef, { comments: updatedComments });
        }
    } catch(e) {
        console.error(e);
        alert("Error deleting comment.");
    }
};