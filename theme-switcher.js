// Theme state management
let currentTheme = 'default';
let isDarkMode = false;
let missionTimeInterval = null;
let cachedHeader = null;

// Function to update mission time with RAF
function updateMissionTime() {
    if (!cachedHeader) return;
    
    const now = new Date();
    const missionStart = new Date(now);
    missionStart.setHours(0, 0, 0, 0);
    const elapsedTime = now - missionStart;
    const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
    const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
    
    const missionTime = `MET ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Only update if changed
    if (cachedHeader.getAttribute('data-time') !== missionTime) {
        cachedHeader.setAttribute('data-time', missionTime);
    }
    
    if (currentTheme === 'nasa-punk-v2') {
        requestAnimationFrame(updateMissionTime);
    }
}

// Function to toggle between themes
function toggleTheme() {
    const body = document.getElementById('app-body');
    const themeButton = document.getElementById('theme-toggle');
    const themeStyleButton = document.getElementById('theme-style-toggle');
    
    if (!cachedHeader) {
        cachedHeader = document.querySelector('header');
    }
    
    if (currentTheme === 'default') {
        // Switch to NASA-Punk v2 theme
        body.classList.add('nasa-punk-v2');
        if (isDarkMode) {
            body.classList.add('dark-mode');
        }
        currentTheme = 'nasa-punk-v2';
        themeStyleButton.textContent = 'SWITCH TO DEFAULT THEME';
        
        // Start mission time updates with RAF
        requestAnimationFrame(updateMissionTime);
        
    } else {
        // Switch back to default theme
        body.classList.remove('nasa-punk-v2');
        body.classList.remove('dark-mode');
        currentTheme = 'default';
        themeStyleButton.textContent = 'SWITCH TO NASA-PUNK V2';
        
        // Clear mission time
        if (cachedHeader) {
            cachedHeader.removeAttribute('data-time');
        }
    }
}

// Function to toggle dark mode
function toggleDarkMode() {
    const body = document.getElementById('app-body');
    isDarkMode = !isDarkMode;
    
    if (currentTheme === 'nasa-punk-v2') {
        if (isDarkMode) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    } else {
        if (isDarkMode) {
            body.classList.add('dark');
            document.documentElement.classList.add('dark');
        } else {
            body.classList.remove('dark');
            document.documentElement.classList.remove('dark');
        }
    }
}

// Initialize theme switcher
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header div.flex.gap-4');
    cachedHeader = document.querySelector('header');
    
    // Create theme style toggle button
    const themeStyleButton = document.createElement('button');
    themeStyleButton.id = 'theme-style-toggle';
    themeStyleButton.className = 'px-4 py-2 bg-gray-300 rounded font-mono text-gray-800 hover:bg-gray-400 transition-colors';
    themeStyleButton.textContent = 'SWITCH TO NASA-PUNK V2';
    themeStyleButton.onclick = toggleTheme;
    
    // Add the button to the header
    header.insertBefore(themeStyleButton, header.firstChild);
    
    // Set up dark mode toggle
    const darkModeButton = document.getElementById('theme-toggle');
    if (darkModeButton) {
        darkModeButton.onclick = toggleDarkMode;
    }
}); 