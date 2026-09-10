import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzJgmqfAJldLXuwRLjdHbhRi7Xi0I9WGU",
    authDomain: "campus-socia.firebaseapp.com",
    projectId: "campus-socia",
    storageBucket: "campus-socia.firebasestorage.app",
    messagingSenderId: "72432391092",
    appId: "1:72432391092:web:d97a1701b402a0ccf758e1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔴 SECURITY: Sirf in emails ko Admin panel kholne milega
const adminEmails = [
    "sanidhyapethe@gmail.com", 
    "chaitaliholey6@gmail.com"
];

onAuthStateChanged(auth, (user) => {
    if (!user || !adminEmails.includes(user.email)) {
        alert("Unauthorized Access. Redirecting to feed.");
        window.location.href = "dashboard.html";
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// 1. Fetch Stats
async function loadStats() {
    const usersSnap = await getDocs(collection(db, "users"));
    document.getElementById('stat-users').innerText = usersSnap.size;
}
loadStats();

// 2. Update Poll
document.getElementById('update-poll-btn').addEventListener('click', async () => {
    const q = document.getElementById('poll-question').value;
    const a = document.getElementById('poll-opt1').value;
    const b = document.getElementById('poll-opt2').value;

    if (!q || !a || !b) return alert("Fill all poll fields!");

    await setDoc(doc(db, "polls", "daily_poll"), {
        question: q,
        optionA: a,
        optionB: b,
        votesA: 0,
        votesB: 0,
        updatedAt: new Date()
    });
    alert("✅ Poll Updated Globally!");
});

// 3. Update Notice
document.getElementById('update-notice-btn').addEventListener('click', async () => {
    const text = document.getElementById('notice-text').value;
    if (!text) return alert("Notice text cannot be empty!");

    await setDoc(doc(db, "app_settings", "global_notice"), {
        content: text,
        updatedAt: new Date()
    });
    alert("✅ Notice Updated Globally!");
});

// 4. Real-time Moderation Queue (Reports)
const reportsRef = collection(db, "reported_content");
onSnapshot(reportsRef, (snapshot) => {
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = "";
    document.getElementById('stat-reports').innerText = snapshot.size;

    if (snapshot.empty) {
        reportsList.innerHTML = "<p style='color: #10b981; font-weight: bold;'>🎉 Zero pending reports. Campus is safe!</p>";
        return;
    }

    snapshot.forEach((reportDoc) => {
        const data = reportDoc.data();
        reportsList.innerHTML += `
            <div style="border: 1px solid var(--border); padding: 15px; border-radius: 8px; background: white; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="margin: 0; font-weight: bold;">Collection: <span style="color: #e11d48;">${data.reportedFromCollection}</span></p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: gray;">Post ID: ${data.reportedPostId}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="dismissReport('${reportDoc.id}')" style="background: var(--surface); color: var(--text-main); border: 1px solid var(--border); padding: 8px 15px; border-radius: 6px; cursor: pointer;">Ignore</button>
                    <button onclick="deleteReportedPost('${reportDoc.id}', '${data.reportedFromCollection}', '${data.reportedPostId}')" style="background: #e11d48; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">Delete Post</button>
                </div>
            </div>
        `;
    });
});

// Global Admin Action Functions
window.dismissReport = async (reportId) => {
    if (confirm("Dismiss this report?")) {
        await deleteDoc(doc(db, "reported_content", reportId));
    }
};

window.deleteReportedPost = async (reportId, collectionName, postId) => {
    if (confirm("🚨 DELETE this post from the database forever?")) {
        try {
            await deleteDoc(doc(db, collectionName, postId)); // Delete the bad post
            await deleteDoc(doc(db, "reported_content", reportId)); // Clear the report
            alert("Spam deleted successfully.");
        } catch (error) {
            console.error(error);
            alert("Error deleting post. Check your Firebase Admin Rules.");
        }
    }
};