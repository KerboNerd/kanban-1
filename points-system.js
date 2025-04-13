// Points System Configuration
const POINTS_CONFIG = {
    taskCompletion: {
        base: 100,
        priority: {
            low: 50,
            medium: 100,
            high: 200,
            critical: 400
        },
        earlyBonus: 300, // Bonus for completing before due date
        streakBonus: 50  // Per day of streak
    }
};

// Ranks Configuration
const RANKS = [
    { name: "CADET", threshold: 0, color: "#4A5568" },
    { name: "ENSIGN", threshold: 1000, color: "#2B6CB0" },
    { name: "LIEUTENANT", threshold: 2500, color: "#2C7A7B" },
    { name: "COMMANDER", threshold: 5000, color: "#9C4221" },
    { name: "CAPTAIN", threshold: 10000, color: "#975A16" },
    { name: "ADMIRAL", threshold: 25000, color: "#1A365D" }
];

// Achievements Configuration
const ACHIEVEMENTS = [
    { id: "first_task", name: "FIRST STEPS", description: "Complete your first task", points: 200 },
    { id: "streak_3", name: "STEADY COURSE", description: "Maintain a 3-day completion streak", points: 500 },
    { id: "priority_master", name: "PRIORITY MASTER", description: "Complete 5 critical tasks", points: 1000 },
    { id: "speed_demon", name: "SPEED DEMON", description: "Complete 3 tasks before their due date", points: 800 },
    { id: "task_variety", name: "MISSION SPECIALIST", description: "Complete tasks of all priority levels", points: 1500 }
];

// State Management
let state = {
    points: 0,
    rank: RANKS[0],
    achievements: [],
    streak: 0,
    lastCompletionDate: null,
    stats: {
        tasksCompleted: 0,
        criticalTasksCompleted: 0,
        earlyCompletions: 0
    }
};

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('pointsSystem');
    if (savedState) {
        state = JSON.parse(savedState);
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('pointsSystem', JSON.stringify(state));
}

// Initialize Points System UI
function initializePointsSystem() {
    loadState();
    createPointsDisplay();
    updatePointsDisplay();
}

// Create Points Display
function createPointsDisplay() {
    const header = document.querySelector('header');
    const pointsContainer = document.createElement('div');
    pointsContainer.className = 'points-container font-mono';
    pointsContainer.innerHTML = `
        <div class="mission-points">
            <span class="points-value">0</span>
            <div class="points-label">MISSION POINTS</div>
        </div>
        <div class="points-details">
            <div>RANK: <span class="rank-value">CADET</span></div>
            <div>STREAK: <span class="streak-value">0</span> DAYS</div>
            <div class="stats">
                <span>MISSIONS: <span class="stats-missions">0</span></span>
                <span>CRITICAL: <span class="stats-critical">0</span></span>
                <span>EARLY: <span class="stats-early">0</span></span>
            </div>
        </div>
    `;
    header.appendChild(pointsContainer);
}

// Update Points Display
function updatePointsDisplay() {
    document.querySelector('.points-value').textContent = state.points;
    document.querySelector('.rank-value').textContent = state.rank.name;
    document.querySelector('.rank-value').style.color = state.rank.color;
    document.querySelector('.streak-value').textContent = state.streak;
    document.querySelector('.stats-missions').textContent = state.stats.tasksCompleted;
    document.querySelector('.stats-critical').textContent = state.stats.criticalTasksCompleted;
    document.querySelector('.stats-early').textContent = state.stats.earlyCompletions;
}

// Calculate Points for Task Completion
function calculateTaskPoints(task) {
    let points = POINTS_CONFIG.taskCompletion.base;
    
    // Add priority bonus
    points += POINTS_CONFIG.taskCompletion.priority[task.priority];
    
    // Add early completion bonus
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate > new Date()) {
            points += POINTS_CONFIG.taskCompletion.earlyBonus;
            state.stats.earlyCompletions++;
        }
    }
    
    // Add streak bonus
    points += state.streak * POINTS_CONFIG.taskCompletion.streakBonus;
    
    return points;
}

// Update Streak
function updateStreak() {
    const today = new Date().toDateString();
    if (state.lastCompletionDate === today) {
        return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (state.lastCompletionDate === yesterday.toDateString()) {
        state.streak++;
    } else {
        state.streak = 1;
    }
    
    state.lastCompletionDate = today;
}

// Check and Award Achievements
function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (state.achievements.includes(achievement.id)) {
            return;
        }
        
        let earned = false;
        switch (achievement.id) {
            case 'first_task':
                earned = state.stats.tasksCompleted === 1;
                break;
            case 'streak_3':
                earned = state.streak >= 3;
                break;
            case 'priority_master':
                earned = state.stats.criticalTasksCompleted >= 5;
                break;
            case 'speed_demon':
                earned = state.stats.earlyCompletions >= 3;
                break;
            case 'task_variety':
                earned = state.stats.tasksCompleted >= 4; // Simplified check
                break;
        }
        
        if (earned) {
            state.achievements.push(achievement.id);
            state.points += achievement.points;
            showAchievementNotification(achievement);
        }
    });
}

// Update Rank
function updateRank() {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (state.points >= RANKS[i].threshold) {
            if (state.rank.name !== RANKS[i].name) {
                state.rank = RANKS[i];
                showRankUpNotification(RANKS[i]);
            }
            break;
        }
    }
}

// Show Achievement Notification
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 font-mono';
    notification.innerHTML = `
        <div class="text-lg font-bold">${achievement.name} UNLOCKED!</div>
        <div class="text-sm">${achievement.description}</div>
        <div class="text-sm mt-2">+${achievement.points} POINTS</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Show Rank Up Notification
function showRankUpNotification(newRank) {
    const notification = document.createElement('div');
    notification.className = 'rank-notification fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 font-mono';
    notification.innerHTML = `
        <div class="text-lg font-bold">RANK UP!</div>
        <div class="text-sm">You've been promoted to</div>
        <div class="text-xl mt-1" style="color: ${newRank.color}">${newRank.name}</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Handle Task Completion
function handleTaskCompletion(task) {
    const points = calculateTaskPoints(task);
    state.points += points;
    state.stats.tasksCompleted++;
    
    if (task.priority === 'critical') {
        state.stats.criticalTasksCompleted++;
    }
    
    updateStreak();
    checkAchievements();
    updateRank();
    updatePointsDisplay();
    saveState();
    
    showPointsNotification(points);
}

// Show Points Notification
function showPointsNotification(points) {
    const notification = document.createElement('div');
    notification.className = 'points-notification fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 font-mono';
    notification.innerHTML = `
        <div class="text-lg font-bold">+${points} POINTS</div>
        <div class="text-sm">Task Completed!</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize the points system when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializePointsSystem);

// Export functions for use in other files
window.pointsSystem = {
    handleTaskCompletion
}; 