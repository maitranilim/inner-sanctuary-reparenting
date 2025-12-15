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
        }
    });
    
    // Toggle current pillar
    content.classList.toggle('hidden');
}

// Copy text function
function copyText() {
    const wiseText = document.querySelector('.wise-text').textContent;
    const actionText = document.querySelector('.action-text').textContent;
    const textToCopy = wiseText + '\n\n' + actionText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Show success message
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy text');
    });
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
});

// Initialize on page load
window.addEventListener('load', function() {
    console.log('Inner Sanctuary - Reparenting website loaded successfully');
});
