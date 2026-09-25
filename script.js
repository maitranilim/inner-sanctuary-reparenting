// Dialogue data for different feelings
const dialogueData = {
    unworthy: {
        trigger: 'Triggered by criticism or failure',
        old: "This is too much. You can't handle this. You're going to fail.",
        wise: "It makes sense that this feels big right now. We don't have to do it all at once. I am right here with you, one step at a time.",
        action: "Wrap yourself in a blanket or hug yourself tight."
    },
    invisible: {
        trigger: 'Triggered by being spoken over',
        old: "No one sees you. You don't matter. Your voice doesn't count.",
        wise: "Your voice matters, and I hear you. Even if others don't see you right now, I do. Let's speak your truth together.",
        action: "Write down what you wanted to say. Your words are valid."
    },
    overwhelmed: {
        trigger: 'Triggered by chaos or new tasks',
        old: "You're drowning. This is too much. You should give up.",
        wise: "I see that you're scared right now. That's okay. We can break this down into tiny, manageable pieces. You're stronger than you think.",
        action: "Take 5 deep breaths. Ground yourself by naming 5 things you can see."
    },
    guilty: {
        trigger: 'Triggered by setting a boundary',
        old: "You're selfish. You're hurting others. You don't deserve to rest.",
        wise: "Setting a boundary is an act of self-love, not selfishness. You are allowed to protect your peace. This is strength, not cruelty.",
        action: "Place your hand on your heart and repeat: I deserve to take care of myself."
    }
};

// Handle feeling selection
document.getElementById('feeling-select').addEventListener('change', function(e) {
    const selectedFeeling = e.target.value;
    const dialogueContent = document.getElementById('dialogue-content');
    
    if (selectedFeeling && dialogueData[selectedFeeling]) {
        const data = dialogueData[selectedFeeling];
        
        // Update dialogue content
        document.querySelector('.dialogue-trigger').textContent = data.trigger;
        document.querySelector('.old-text').textContent = data.old;
        document.querySelector('.wise-text').textContent = data.wise;
        document.querySelector('.action-text').textContent = '\ud83c\udf1f Action: ' + data.action;
        
        // Show dialogue content
        dialogueContent.classList.remove('hidden');
    } else {
        // Hide dialogue content if no feeling is selected
        dialogueContent.classList.add('hidden');
    }
});

// Toggle pillar content
function togglePillar(element) {
    const content = element.querySelector('.pillar-content');
    
    // Close all other pillars
    document.querySelectorAll('.pillar-content').forEach(item => {
        if (item !== content) {
            item.classList.add('hidden');
            item.closest('.pillar').setAttribute('aria-expanded', 'false');
        }
    });
    
    // Toggle current pillar
    content.classList.toggle('hidden');
    element.setAttribute('aria-expanded', String(!content.classList.contains('hidden')));
}

// Copy text function
function copyText() {
    const wiseText = document.querySelector('.wise-text').textContent;
    const actionText = document.querySelector('.action-text').textContent;
    const textToCopy = wiseText + '\n\n' + actionText;
    
    const showCopied = () => {
        // Show success message
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(showCopied).catch(() => {
            alert('Could not copy automatically. Please select the text and copy it manually.');
        });
    } else {
        alert('Copy is not available in this browser. Please select the text and copy it manually.');
    }
}

// Add scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'all 0.6s ease';
    observer.observe(section);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add hover effects to interactive elements
document.querySelectorAll('.pillar').forEach(pillar => {
    pillar.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
    });
    pillar.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            togglePillar(pillar);
        }
    });
});

// Initialize on page load
window.addEventListener('load', function() {
    console.log('Inner Sanctuary - Reparenting website loaded successfully');
});

// Remember the user's preferred visual mode without sending data anywhere.
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('inner-sanctuary-theme');
if (savedTheme === 'dark') document.body.classList.add('dark-mode');
function updateThemeLabel() {
    const dark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = dark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
updateThemeLabel();
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('inner-sanctuary-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeLabel();
});

// Daily check-in: intentionally local-only and limited to a small history.
const noteInput = document.getElementById('check-in-note');
const characterCount = document.getElementById('character-count');
const saveStatus = document.getElementById('save-status');
let history = [];
try {
    const savedHistory = JSON.parse(localStorage.getItem('inner-sanctuary-check-ins') || '[]');
    if (Array.isArray(savedHistory)) history = savedHistory;
} catch (error) {
    localStorage.removeItem('inner-sanctuary-check-ins');
}
function renderHistory() {
    const historyElement = document.getElementById('check-in-history');
    if (!history.length) {
        historyElement.textContent = 'Your saved reflections will appear here.';
        return;
    }
    historyElement.textContent = `${history.length} reflection${history.length === 1 ? '' : 's'} saved in this browser.`;
}
noteInput.addEventListener('input', () => {
    characterCount.textContent = `${noteInput.value.length} / 500`;
});
document.getElementById('save-check-in').addEventListener('click', () => {
    const note = noteInput.value.trim();
    if (!note) {
        saveStatus.textContent = 'Write a few words first, if you would like to save them.';
        return;
    }
    history.unshift({ date: new Date().toLocaleDateString(), note });
    history.splice(5);
    localStorage.setItem('inner-sanctuary-check-ins', JSON.stringify(history));
    saveStatus.textContent = 'Saved gently, just on this device.';
    noteInput.value = '';
    characterCount.textContent = '0 / 500';
    renderHistory();
});
renderHistory();

document.querySelectorAll('[data-need]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-need]').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        document.getElementById('selected-need').textContent = `You might be needing: ${button.dataset.need}.`;
    });
});

// A self-contained breathing timer that stops automatically after one minute.
const breathingToggle = document.getElementById('breathing-toggle');
const breathingCircle = document.getElementById('breathing-circle');
const breathingInstruction = document.getElementById('breathing-instruction');
let breathingTimer;
let breathingInterval;
breathingToggle.addEventListener('click', () => {
    if (breathingTimer) {
        clearTimeout(breathingTimer);
        clearInterval(breathingInterval);
        breathingTimer = null;
        breathingCircle.classList.remove('active');
        breathingCircle.textContent = 'Ready';
        breathingInstruction.textContent = 'When you\'re ready, begin with a slow inhale.';
        breathingToggle.textContent = 'Start 60-second pause';
        return;
    }
    let elapsed = 0;
    breathingCircle.classList.add('active');
    breathingToggle.textContent = 'Stop pause';
    const update = () => {
        elapsed += 1;
        const breathingIn = elapsed % 2 === 1;
        breathingCircle.textContent = breathingIn ? 'Breathe in' : 'Breathe out';
        breathingInstruction.textContent = breathingIn ? 'Slowly welcome the breath in.' : 'Let the breath leave without forcing it.';
    };
    update();
    breathingInterval = setInterval(update, 4000);
    breathingTimer = setTimeout(() => breathingToggle.click(), 60000);
});
