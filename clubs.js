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

let currentUser = null;
let userProfile = null;
let currentClub = "Coding Club"; 

// 🔴 DYNAMIC CACHE LOGIC
const userCache = {};

async function getFreshUserData(uid) {
    if (!uid) return { fullName: "Anonymous Student", branch: "", year: "" };
    if (userCache[uid]) return userCache[uid]; 
    
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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) userProfile = docSnap.data();
        loadClubPosts();
    }
});

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
        alert(`⏳ Hold on! Please wait ${remainingSeconds} seconds before posting another club message.`);
        return false;
    }
    return true;
}

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

const clubOptions = document.querySelectorAll('.club-option');
const activeClubTitle = document.getElementById('active-club-title');

clubOptions.forEach(option => {
    option.addEventListener('click', function() {
        clubOptions.forEach(opt => {
            opt.style.background = "none";
        });
        
        this.style.background = "#f0f2f5";
        currentClub = this.getAttribute('data-club');
        activeClubTitle.innerText = this.innerText;
        loadClubPosts(); 
    });
});

const postBtn = document.getElementById('club-post-btn');
const postInput = document.getElementById('club-post-input');

// 🔴 CREATE CLUB POST (Removed hardcoded name)
postBtn.addEventListener('click', async () => {
    if (!canUserPost('club')) return;

    const text = postInput.value.trim();
    
    if (!text || !userProfile || !currentUser) {
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
            authorId: currentUser.uid, // Only ID saved
            timestamp: new Date(),
            likes: [], 
            comments: [] 
        });
        
        localStorage.setItem('last_post_time_club', Date.now());
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

window.likeClubPost = async (postId, currentLikes) => {
    const postRef = doc(db, "club_posts", postId);
    try {
        if (currentLikes.includes(currentUser.uid)) {
            await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        }
    } catch (error) {
        console.error("Error liking post:", error);
    }
};

window.toggleCommentSection = (postId) => {
    const section = document.getElementById(`comment-section-${postId}`);
    section.style.display = section.style.display === "none" ? "block" : "none";
};

window.submitClubComment = async (postId) => {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    try {
        const postRef = doc(db, "club_posts", postId);
        await updateDoc(postRef, {
            comments: arrayUnion({
                commentId: currentUser.uid + '_' + Date.now(), // 🔴 Unique ID added
                text: text,
                authorId: currentUser.uid, 
                timestamp: Date.now()
            })
        });
        input.value = ""; 
    } catch (error) {
        console.error("Error posting comment:", error);
        alert("Failed to post comment.");
    } finally {
        input.disabled = false;
    }
};
const feedContainer = document.getElementById('club-live-posts');
let unsubscribe = null;

// 🔴 DYNAMIC FEED RENDER LOGIC
function loadClubPosts() {
    const postsQuery = query(collection(db, "club_posts"), orderBy("timestamp", "desc"));
    
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        const tempContainer = document.createElement('div');
        let postCount = 0;

        for (const docSnapshot of snapshot.docs) {
            const postData = docSnapshot.data();
            
            if (postData.clubName === currentClub) {
                postCount++;
                
                // Fetch Post Author Details
                const postAuthorInfo = await getFreshUserData(postData.authorId);
                
                const likesArray = postData.likes || [];
                const commentsArray = postData.comments || []; 
                
                const isLiked = likesArray.includes(currentUser.uid);
                const likeColor = isLiked ? "#e11d48" : "gray";
                const likeText = isLiked ? "❤️ Liked" : "🤍 Like";

                // Generate HTML for existing comments with Dynamic Author Names & Action Buttons
                let commentsHTML = '';
                for (const comment of commentsArray) {
                    const commenterId = comment.authorId || comment.uid; 
                    const commentAuthorInfo = await getFreshUserData(commenterId);
                    
                    // 🔴 NAYA LOGIC: Check if user owns the comment
                    let actionButtons = '';
                    if (commenterId === currentUser.uid) {
                        const uniqueCId = comment.commentId || comment.timestamp;
                        actionButtons = `
                            <div style="display: flex; gap: 8px;">
                                <button onclick="window.editClubComment('${docSnapshot.id}', '${uniqueCId}', '${escapeHTML(comment.text).replace(/'/g, "\\'")}')" style="background:none; border:none; color: #3b82f6; cursor:pointer; font-size:12px; padding:0;">✏️ Edit</button>
                                <button onclick="window.deleteClubComment('${docSnapshot.id}', '${uniqueCId}')" style="background:none; border:none; color: #e11d48; cursor:pointer; font-size:12px; padding:0;">🗑️ Delete</button>
                            </div>
                        `;
                    }

                    commentsHTML += `
                        <div style="background: var(--bg-color); padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <strong style="font-size: 13px; color: var(--primary);">${escapeHTML(commentAuthorInfo.fullName)}</strong>
                                <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--text-main);">${escapeHTML(comment.text)}</p>
                            </div>
                            ${actionButtons}
                        </div>
                    `;
                }

                const postElement = document.createElement('div');
                postElement.className = 'post modern-card';
                postElement.style.padding = '20px';
                postElement.style.marginBottom = '15px';
                
                postElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <h4 style="margin: 0; color: #1f2937;">${escapeHTML(postAuthorInfo.fullName)} 
                            <span style="font-size: 13px; color: gray; font-weight: normal;">(${escapeHTML(postData.clubName)})</span>
                        </h4>
                    </div>
                    
                    <p style="margin: 15px 0; color: #333; line-height: 1.5;">${escapeHTML(postData.content)}</p>
                    
                    <div style="display: flex; gap: 15px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px;">
                        <button onclick="window.likeClubPost('${docSnapshot.id}', ['${likesArray.join("','")}'])" 
                            style="background: none; border: none; color: ${likeColor}; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            ${likeText} (${likesArray.length})
                        </button>
                        
                        <button onclick="window.toggleCommentSection('${docSnapshot.id}')" 
                            style="background: none; border: none; color: gray; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            💬 Comment (${commentsArray.length})
                        </button>
                        
                        <button onclick="window.reportPost('${docSnapshot.id}', 'club_posts')" 
                            style="background: none; border: none; color: #e11d48; cursor: pointer; font-size: 14px; font-weight: bold; margin-left: auto; display: flex; align-items: center; gap: 5px;">
                            ⚠️ Report
                        </button>
                    </div>

                    <div id="comment-section-${docSnapshot.id}" style="display: none; margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px;">
                        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 10px;">
                            ${commentsHTML}
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="comment-input-${docSnapshot.id}" placeholder="Write a comment..." 
                                style="flex: 1; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); font-family: inherit; outline: none; background: var(--bg-color);">
                            <button onclick="window.submitClubComment('${docSnapshot.id}')" 
                                style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: var(--radius-md); font-weight: bold; cursor: pointer;">
                                Post
                            </button>
                        </div>
                    </div>
                `;
                tempContainer.appendChild(postElement);
            }
        }

        feedContainer.innerHTML = ""; 
        if (postCount === 0) {
            feedContainer.innerHTML = `<div class="modern-card" style="padding: 30px; text-align: center;"><p style='color:gray; margin: 0;'>No discussions in ${currentClub} yet. Be the first to start!</p></div>`;
        } else {
            feedContainer.appendChild(tempContainer);
        }
    });
}

// 🔴 Global Edit Club Comment Function
window.editClubComment = async (postId, commentId, oldText) => {
    const newText = prompt("Edit your comment:", oldText);
    if (!newText || newText.trim() === "" || newText === oldText) return;
    
    const postRef = doc(db, "club_posts", postId);
    try {
        const snap = await getDoc(postRef);
        if(snap.exists()) {
            const post = snap.data();
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

// 🔴 Global Delete Club Comment Function
window.deleteClubComment = async (postId, commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    const postRef = doc(db, "club_posts", postId);
    try {
        const snap = await getDoc(postRef);
        if(snap.exists()) {
            const post = snap.data();
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