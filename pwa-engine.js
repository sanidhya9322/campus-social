// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered!', reg.scope))
            .catch(err => console.error('SW Failed!', err));
    });
}

// Behavioral Installation Funnel
let deferredPrompt;
const ACTIVE_TIME_TRIGGER = 30000; // 30 seconds

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing automatically
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Start the 30-second active timer
    setTimeout(injectInstallModal, ACTIVE_TIME_TRIGGER);
});

function injectInstallModal() {
    // Avoid showing if already installed or prompt is gone
    if (!deferredPrompt) return;

    // Injecting HTML/CSS via JS for a clean, modular setup
    const modalHTML = `
        <div id="pwa-install-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; justify-content: center; align-items: flex-end; padding: 20px; animation: fadeIn 0.4s ease-out;">
            <div style="background: white; width: 100%; max-width: 400px; padding: 25px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center; transform: translateY(0); animation: slideUp 0.4s ease-out;">
                <div style="background: #2563eb; width: 60px; height: 60px; border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 30px;">🚀</div>
                <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 22px;">Upgrade Your Experience</h2>
                <p style="color: #4b5563; margin-bottom: 20px; font-size: 15px; line-height: 1.5;">Install the <strong>Campus Social App</strong> for lightning-fast access, offline features, and a better experience.</p>
                <button id="pwa-install-btn" style="width: 100%; padding: 15px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">Install Now - It's Free</button>
                <button id="pwa-dismiss-btn" style="width: 100%; padding: 12px; background: transparent; color: #6b7280; border: none; font-size: 14px; margin-top: 5px; cursor: pointer;">Maybe Later</button>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        const overlay = document.getElementById('pwa-install-overlay');
        overlay.style.display = 'none';
        
        // Trigger the native browser prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`User installation prompt outcome: ${outcome}`);
        deferredPrompt = null; // We can only use it once
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        document.getElementById('pwa-install-overlay').style.display = 'none';
        // Optionally save to localStorage to avoid nagging the user again for 7 days
        localStorage.setItem('pwa-prompt-dismissed', Date.now());
    });
}