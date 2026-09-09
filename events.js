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

// Declare global variables for user state
let currentUser = null;
let userProfile = null;

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Strict Auth Check & Initial Data Loading
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;

        // Load logged-in user profile
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                userProfile = docSnap.data();
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }

        // Load Events Live after user authentication is confirmed
        loadEvents();
    }
});

// Logout Listener
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// Create Event (With Smart Button UI)
const createBtn = document.getElementById('create-event-btn');
createBtn.addEventListener('click', async () => {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const location = document.getElementById('event-location').value.trim();

    if (!title || !date || !location || !userProfile || !currentUser) {
        const originalText = createBtn.innerText;
        createBtn.innerText = "⚠️ Please fill all details!";
        createBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            createBtn.innerText = originalText;
            createBtn.style.backgroundColor = "#8b5cf6";
        }, 2000);
        return;
    }

    createBtn.innerText = "Creating Event...";
    createBtn.disabled = true;

    try {
        await addDoc(collection(db, "campus_events"), {
            title: title,
            date: date,
            location: location,
            hostName: userProfile.fullName,
            authorId: currentUser.uid,
            attendees: [], 
            timestamp: new Date()
        });
        
        document.getElementById('event-title').value = "";
        document.getElementById('event-date').value = "";
        document.getElementById('event-location').value = "";
        
        createBtn.innerText = "✅ Event Created!";
        setTimeout(() => {
            createBtn.innerText = "Create Event";
            createBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error("Error creating event:", error);
        createBtn.innerText = "❌ Error Creating Event";
        createBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            createBtn.innerText = "Create Event";
            createBtn.style.backgroundColor = "#8b5cf6";
            createBtn.disabled = false;
        }, 2000);
    }
});

// Function to attach real-time Firestore listener for campus events
function loadEvents() {
    const eventsQuery = query(collection(db, "campus_events"), orderBy("timestamp", "desc"));
    const eventsContainer = document.getElementById('events-list');

    onSnapshot(eventsQuery, (snapshot) => {
        eventsContainer.innerHTML = "";
        
        if (snapshot.empty) {
            eventsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>No upcoming events. Host one!</p>";
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const eventData = docSnap.data();
            const eventId = docSnap.id;
            
            // FOMO Logic: Attendees count nikalo
            const attendeesList = eventData.attendees || [];
            const attendeesCount = attendeesList.length;
            
            // Check karo ki kya current user pehle se ja raha hai
            let isGoing = false;
            if (currentUser && attendeesList.includes(currentUser.uid)) {
                isGoing = true;
            }

            const eventCard = document.createElement('div');
            eventCard.className = 'post';
            
            eventCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0; color: #8b5cf6;">${escapeHTML(eventData.title)}</h3>
                        <p style="margin: 5px 0 0 0; color: #555;"><strong>📅 Date:</strong> ${escapeHTML(eventData.date)} | <strong>📍 Location:</strong> ${escapeHTML(eventData.location)}</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: gray;">Hosted by: ${escapeHTML(eventData.hostName)}</p>
                    </div>
                </div>
                
                <div style="margin-top: 15px; display: flex; align-items: center; justify-content: space-between; background: #f9fafb; padding: 10px; border-radius: 8px;">
                    <span style="font-weight: bold; color: #e11d48;">🔥 ${attendeesCount} students are going</span>
                    
                    ${isGoing 
                        ? `<button disabled style="background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: not-allowed;">You're going! ✅</button>`
                        : `<button class="going-btn" style="background: #2563eb; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer;">I'm Going ✋</button>`
                    }
                </div>
            `;
            
            // "I'm Going" button ka click event
            if (!isGoing) {
                const goingBtn = eventCard.querySelector('.going-btn');
                goingBtn.addEventListener('click', async () => {
                    if (!currentUser) return;
                    await updateDoc(doc(db, "campus_events", eventId), {
                        attendees: arrayUnion(currentUser.uid)
                    });
                });
            }
            
            eventsContainer.appendChild(eventCard);
        });
    });
}