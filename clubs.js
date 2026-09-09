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
    measurementId: "G-BTNMN5KHZL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let currentUser = null;
let userProfile = null;
let currentClub = "Coding Club"; 

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
            authorName: userProfile.fullName,
            authorId: currentUser.uid,
            timestamp: new Date(),
            likes: [] // Add empty likes array for new posts
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


// ----------------------------------------------------
// Global Like & Comment Functions for Clubs
// ----------------------------------------------------
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

window.commentOnClubPost = (postId) => {
    alert("Comment feature for clubs is coming soon!"); 
    // Yahan tum apna comment modal/logic laga sakte ho baad mein
};


const feedContainer = document.getElementById('club-live-posts');
let unsubscribe = null;

function loadClubPosts() {
    const postsQuery = query(collection(db, "club_posts"), orderBy("timestamp", "desc"));
    
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        feedContainer.innerHTML = ""; 
        let postCount = 0;

        snapshot.forEach((docSnapshot) => {
            const postData = docSnapshot.data();
            
            if (postData.clubName === currentClub) {
                postCount++;
                
                // Ensure likes array exists to prevent errors on old posts
                const likesArray = postData.likes || [];
                const isLiked = likesArray.includes(currentUser.uid);
                const likeColor = isLiked ? "#e11d48" : "gray";
                const likeText = isLiked ? "❤️ Liked" : "🤍 Like";

                const postElement = document.createElement('div');
                postElement.className = 'post modern-card';
                postElement.style.padding = '20px';
                postElement.style.marginBottom = '15px';
                
                postElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <h4 style="margin: 0; color: #1f2937;">${escapeHTML(postData.authorName)} 
                            <span style="font-size: 13px; color: gray; font-weight: normal;">(${escapeHTML(postData.clubName)})</span>
                        </h4>
                    </div>
                    
                    <p style="margin: 15px 0; color: #333; line-height: 1.5;">${escapeHTML(postData.content)}</p>
                    
                    <div style="display: flex; gap: 15px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px;">
                        
                        <!-- Like Button -->
                        <button onclick="window.likeClubPost('${docSnapshot.id}', ['${likesArray.join("','")}'])" 
                            style="background: none; border: none; color: ${likeColor}; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            ${likeText} (${likesArray.length})
                        </button>
                        
                        <!-- Comment Button -->
                        <button onclick="window.commentOnClubPost('${docSnapshot.id}')" 
                            style="background: none; border: none; color: gray; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            💬 Comment
                        </button>
                        
                        <!-- NEW: Report Button -->
                        <button onclick="window.reportPost('${docSnapshot.id}', 'club_posts')" 
                            style="background: none; border: none; color: #e11d48; cursor: pointer; font-size: 14px; font-weight: bold; margin-left: auto; display: flex; align-items: center; gap: 5px;">
                            ⚠️ Report
                        </button>

                    </div>
                `;
                feedContainer.appendChild(postElement);
            }
        });

        if (postCount === 0) {
            feedContainer.innerHTML = `<div class="modern-card" style="padding: 30px; text-align: center;"><p style='color:gray; margin: 0;'>No discussions in ${currentClub} yet. Be the first to start!</p></div>`;
        }
    });
}