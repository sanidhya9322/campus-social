import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

// Initialize Firebase Core Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Global Variables
let currentUser = null;
let userProfile = null;

// Firebase Auth Block: Check Login & Fetch Profile
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        
        // Fetch additional user profile data
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            userProfile = docSnap.data();
        }

        // Load marketplace items
        loadMarketplaceListings();
    }
});

// XSS Protection Helper Function
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Cooldown check function (60 Seconds)
function canUserPost(postType = 'general') {
    const COOLDOWN_TIME = 60000;
    const lastPostTime = localStorage.getItem(`last_post_time_${postType}`);
    
    if (lastPostTime && (Date.now() - lastPostTime < COOLDOWN_TIME)) {
        const remainingSeconds = Math.ceil((COOLDOWN_TIME - (Date.now() - lastPostTime)) / 1000);
        alert(`⏳ Hold on! Please wait ${remainingSeconds} seconds before posting another ${postType} item.`);
        return false;
    }
    return true;
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// List an Item
const listBtn = document.getElementById('list-item-btn');
if (listBtn) {
    listBtn.addEventListener('click', async () => {

        if (!canUserPost('marketplace')) return;

        const itemName = document.getElementById('item-name').value.trim();
        const itemPrice = document.getElementById('item-price').value.trim();

        if (!itemName || !itemPrice || !userProfile || !currentUser) {
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
                sellerName: userProfile.fullName || "Anonymous",
                authorId: currentUser.uid,
                sellerContact: userProfile.email || "",
                reportsCount: 0,
                reportedBy: [],
                timestamp: new Date()
            });
            
            localStorage.setItem('last_post_time_marketplace', Date.now());

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
}

// Load Listings Live
function loadMarketplaceListings() {
    const marketQuery = query(collection(db, "marketplace_items"), orderBy("timestamp", "desc"));
    const listingsContainer = document.getElementById('marketplace-listings');

    if (!listingsContainer) return;

    onSnapshot(marketQuery, (snapshot) => {
        listingsContainer.innerHTML = "";
        
        if (snapshot.empty) {
            listingsContainer.innerHTML = "<p style='color:gray; text-align:center; padding: 20px;'>No items listed yet. Be the first to sell something!</p>";
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const itemId = docSnap.id;
            
            const itemCard = document.createElement('div');
            itemCard.className = 'post'; 
            
            const mailtoLink = `mailto:${escapeHTML(item.sellerContact)}?subject=Interested in buying: ${escapeHTML(item.name)}`;

            itemCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #1f2937;">${escapeHTML(item.name)}</h3>
                    <span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">₹${escapeHTML(String(item.price))}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <p style="margin: 0; color: gray;">Listed by: ${escapeHTML(item.sellerName)}</p>
                    <button onclick="window.reportPost('${itemId}', 'marketplace_items')" style="background: none; border: none; color: #e11d48; cursor: pointer; font-size: 13px; font-weight: bold; margin-left: 15px;">
                        ⚠️ Report
                    </button>
                </div>
                
                <a href="${mailtoLink}" style="display: block; text-align: center; text-decoration: none; background: #2563eb; color: white; width: 100%; margin-top: 15px; padding: 10px; border-radius: 6px; font-weight: bold; box-sizing: border-box;">
                    ✉️ Contact Seller
                </a>
            `;
            
            listingsContainer.appendChild(itemCard);
        });
    });
}