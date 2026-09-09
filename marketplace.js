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

let userProfile = null;

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Check Login & Fetch Profile
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data();
        }
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// List an Item (With Smart Button UI instead of Alerts)
const listBtn = document.getElementById('list-item-btn');
listBtn.addEventListener('click', async () => {
    const itemName = document.getElementById('item-name').value.trim();
    const itemPrice = document.getElementById('item-price').value.trim();

    if (!itemName || !itemPrice || !userProfile) {
        const originalText = listBtn.innerText;
        listBtn.innerText = "⚠️ Please fill all details!";
        listBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            listBtn.innerText = originalText;
            listBtn.style.backgroundColor = "#10b981";
        }, 2000);
        return;
    }

    listBtn.innerText = "Listing Item...";
    listBtn.disabled = true;

    try {
        await addDoc(collection(db, "marketplace_items"), {
            name: itemName,
            price: Number(itemPrice),
            sellerName: userProfile.fullName,
            authorId: currentUser.uid,
            sellerContact: userProfile.email,
            timestamp: new Date()
        });
        
        document.getElementById('item-name').value = "";
        document.getElementById('item-price').value = "";
        
        listBtn.innerText = "✅ Item Listed Successfully!";
        setTimeout(() => {
            listBtn.innerText = "List Item";
            listBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error("Error listing item:", error);
        listBtn.innerText = "❌ Error Listing Item";
        listBtn.style.backgroundColor = "#e11d48";
        setTimeout(() => {
            listBtn.innerText = "List Item";
            listBtn.style.backgroundColor = "#10b981";
            listBtn.disabled = false;
        }, 2000);
    }
});

// Load Listings Live
const marketQuery = query(collection(db, "marketplace_items"), orderBy("timestamp", "desc"));
const listingsContainer = document.getElementById('marketplace-listings');

onSnapshot(marketQuery, (snapshot) => {
    listingsContainer.innerHTML = "";
    
    if (snapshot.empty) {
        listingsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>No items listed yet. Be the first to sell something!</p>";
        return;
    }
    
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        
        const itemCard = document.createElement('div');
        itemCard.className = 'post'; 
        
        // Mailto link for direct email contact
        const mailtoLink = `mailto:${escapeHTML(item.sellerContact)}?subject=Interested in buying: ${escapeHTML(item.name)}`;

        itemCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #1f2937;">${escapeHTML(item.name)}</h3>
                <span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">₹${escapeHTML(String(item.price))}</span>
            </div>
            <p style="margin-top: 10px; color: gray;">Listed by: ${escapeHTML(item.sellerName)}</p>
            
            <a href="${mailtoLink}" style="display: block; text-align: center; text-decoration: none; background: #2563eb; color: white; width: 100%; margin-top: 15px; padding: 10px; border-radius: 6px; font-weight: bold; box-sizing: border-box;">
                ✉️ Contact Seller
            </a>
        `;
        
        listingsContainer.appendChild(itemCard);
    });
});