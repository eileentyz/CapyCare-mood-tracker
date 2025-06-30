document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    // Check if user just logged in and create new chat
    checkForNewLogin();
    
    // Initialize chat sessions
    initializeChatSessions();
    
    // Load saved chat messages from localStorage
    loadChatHistory();
    
    // Update user info display
    updateUserInfo();
    
    // Add support button to interface
    addSupportButton();
    
    // Add event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearCurrentChat);
    }

    // Add event listener for mental health tips button
    const tipsBtn = document.getElementById('tips-icon-btn');
    if (tipsBtn) {
        tipsBtn.addEventListener('click', showMentalHealthTips);
    }

    // Dark mode toggle functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
        // Initialize dark mode state
        initializeDarkMode();
    }

    // Mobile menu button
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
});

// Check if user just logged in and create new chat
function checkForNewLogin() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const lastLoginTime = localStorage.getItem('capycare_last_login');
    const currentTime = Date.now();
    
    // If user exists and this is a fresh login (within last 5 seconds or no previous login)
    if (user.email && (!lastLoginTime || (currentTime - parseInt(lastLoginTime)) < 5000)) {
        // Create a new session
        const newSession = {
            id: generateSessionId(),
            title: 'New Chat',
            timestamp: currentTime,
            messages: []
        };
        // Get existing sessions and add the new one
        const existingSessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
        existingSessions.unshift(newSession); // Add new session at the beginning
        localStorage.setItem('capycare_sessions', JSON.stringify(existingSessions));
        localStorage.setItem('capycare_current_session', newSession.id);
        localStorage.setItem('capycare_last_login', currentTime.toString());
        // Clear chat box and show welcome message
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
            chatBox.innerHTML = '';
            addMessageToUI('bot', getWelcomeMessage());
        }
        // Update chat title
        const chatTitle = document.getElementById('current-chat-title');
        if (chatTitle) {
            chatTitle.textContent = 'New Chat';
        }
        // Update the sessions list in sidebar
        updateSessionsList();
        showNotification('Welcome back! New chat session created. 🦫', 'success');
    }
}

// Initialize chat sessions for the current user
function initializeChatSessions() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    // Check if user just logged in
    const lastLogin = localStorage.getItem(`capycare_last_login_${userId}`);
    const currentTime = Date.now();
    
    // If this is a new login (or first time), create a new session
    if (!lastLogin || (currentTime - parseInt(lastLogin)) > 300000) { // 5 minutes
        const newSessionId = generateSessionId();
        const newSession = {
            id: newSessionId,
            title: 'New Chat',
            timestamp: currentTime,
            lastUpdated: currentTime,
            messages: []
        };
        
        // Get existing sessions for this user
        const existingSessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
        existingSessions.unshift(newSession);
        
        // Save sessions and set current session
        localStorage.setItem(`capycare_sessions_${userId}`, JSON.stringify(existingSessions));
        localStorage.setItem(`capycare_current_session_${userId}`, newSessionId);
        localStorage.setItem(`capycare_last_login_${userId}`, currentTime.toString());
        
        // Update UI
        updateSessionsList();
        
        // Show welcome message
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
            chatBox.innerHTML = '';
            addMessageToUI('bot', getWelcomeMessage());
        }
        
        console.log('New chat session created for user:', userId);
    }
}

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update sessions list in sidebar
function updateSessionsList() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    const chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) return;
    
    const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
    const currentSessionId = localStorage.getItem(`capycare_current_session_${userId}`);
    
    chatHistory.innerHTML = '';
    
    sessions.forEach(session => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${session.id === currentSessionId ? 'active' : ''}`;
        chatItem.setAttribute('data-session-id', session.id);
        
        const timestamp = new Date(session.timestamp).toLocaleDateString();
        const time = new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        chatItem.innerHTML = `
            <div class="chat-item-icon">💬</div>
            <div class="chat-item-content">
                <div class="chat-item-title">${session.title}</div>
                <div class="chat-item-meta">${timestamp} at ${time}</div>
            </div>
            <button class="delete-session-btn" onclick="deleteSession('${session.id}')" title="Delete session">🗑️</button>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-session-btn')) {
                switchToSession(session.id);
            }
        });
        
        chatHistory.appendChild(chatItem);
    });
}

// Switch to a different chat session
function switchToSession(sessionId) {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    // Save current session before switching
    saveCurrentSession();
    
    // Set new current session
    localStorage.setItem(`capycare_current_session_${userId}`, sessionId);
    
    // Load the selected session
    const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
    const selectedSession = sessions.find(s => s.id === sessionId);
    
    if (selectedSession) {
        loadSessionMessages(selectedSession);
        
        // Update chat title
        const chatTitle = document.getElementById('current-chat-title');
        if (chatTitle) {
            chatTitle.textContent = selectedSession.title;
        }
        
        // Update active session in sidebar
        updateSessionsList();
        
        console.log('Switched to session:', sessionId);
    }
}

// Save current session messages
function saveCurrentSession() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    const currentSessionId = localStorage.getItem(`capycare_current_session_${userId}`);
    if (!currentSessionId) return;
    
    const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
    const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);
    
    if (currentSessionIndex !== -1) {
        const chatBox = document.getElementById('chat-box');
        const messages = [];
        const messageElements = chatBox.querySelectorAll('.chat-message');
        
        messageElements.forEach(element => {
            const isBot = element.classList.contains('bot-message');
            const sender = isBot ? 'bot' : 'user';
            const messageContent = element.querySelector('.message-content');
            
            if (messageContent) {
                const text = messageContent.innerHTML || messageContent.textContent;
                const isHtml = messageContent.innerHTML !== messageContent.textContent;
                
                let mood = 'default';
                if (isBot) {
                    if (element.classList.contains('bot-message-happy')) mood = 'happy';
                    else if (element.classList.contains('bot-message-sad')) mood = 'sad';
                    else if (element.classList.contains('bot-message-anxious')) mood = 'anxious';
                    else if (element.classList.contains('bot-message-calm')) mood = 'calm';
                    else if (element.classList.contains('bot-message-energized')) mood = 'energized';
                }
                
                messages.push({ sender, text, isHtml, mood });
            }
        });
        
        // Update session title based on first user message
        let title = 'New Chat';
        const firstUserMessage = messages.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
            const text = firstUserMessage.text.replace(/<[^>]*>/g, ''); // Remove HTML tags
            title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        }
        
        sessions[currentSessionIndex].messages = messages;
        sessions[currentSessionIndex].title = title;
        sessions[currentSessionIndex].lastUpdated = Date.now();
        
        localStorage.setItem(`capycare_sessions_${userId}`, JSON.stringify(sessions));
    }
}

// Load session messages
function loadSessionMessages(session) {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    
    if (session.messages && session.messages.length > 0) {
        session.messages.forEach(msg => {
            addMessageToUI(msg.sender, msg.text, msg.isHtml, msg.mood);
        });
    } else {
        // Show welcome message for new sessions
        addMessageToUI('bot', getWelcomeMessage());
    }
}

// Get personalized welcome message
function getWelcomeMessage() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const hour = new Date().getHours();
    
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    if (user.name) {
        return `${greeting}, ${user.name}! How are you feeling today? I'm here to chat and support you! 🦫`;
    } else {
        return `${greeting}! How are you feeling today? I'm here to chat and support you! 🦫`;
    }
}

// Delete a chat session
function deleteSession(sessionId) {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    if (confirm('Are you sure you want to delete this chat session? This action cannot be undone.')) {
        const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        
        localStorage.setItem(`capycare_sessions_${userId}`, JSON.stringify(updatedSessions));
        
        // If we deleted the current session, switch to the first available session
        const currentSessionId = localStorage.getItem(`capycare_current_session_${userId}`);
        if (currentSessionId === sessionId) {
            if (updatedSessions.length > 0) {
                switchToSession(updatedSessions[0].id);
            } else {
                // If no sessions left, create a new one
                initializeChatSessions();
            }
        }
        
        updateSessionsList();
        showNotification('Chat session deleted! 🗑️', 'success');
    }
}

// Start a new chat session
function startNewChat() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    // Save current session
    saveCurrentSession();
    
    // Create new session
    const newSessionId = generateSessionId();
    const newSession = {
        id: newSessionId,
        title: 'New Chat',
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        messages: []
    };
    
    // Add to sessions list
    const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
    sessions.unshift(newSession);
    localStorage.setItem(`capycare_sessions_${userId}`, JSON.stringify(sessions));
    
    // Set as current session
    localStorage.setItem(`capycare_current_session_${userId}`, newSessionId);
    
    // Update UI
    updateSessionsList();
    
    // Clear chat box and show welcome message
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    addMessageToUI('bot', getWelcomeMessage());
    
    // Update chat title
    const chatTitle = document.getElementById('current-chat-title');
    if (chatTitle) {
        chatTitle.textContent = 'New Chat';
    }
    
    showNotification('New chat started! 💬', 'success');
}

// Logout function
function logout() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    if (confirm('Are you sure you want to logout?')) {
        // Save current session before logout
        saveCurrentSession();
        
        // Clear user-specific data (but keep chat sessions for this user)
        localStorage.removeItem('capycare_user');
        localStorage.removeItem(`capycare_current_session_${userId}`);
        localStorage.removeItem(`capycare_last_login_${userId}`);
        
        // Clear Firebase auth if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                console.log('User signed out successfully');
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        }
        
        // Show logout message
        showNotification('Logged out successfully! 👋', 'info');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f59e0b';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Load chat history from localStorage (updated for session management)
function loadChatHistory() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    const currentSessionId = localStorage.getItem(`capycare_current_session_${userId}`);
    if (!currentSessionId) {
        initializeChatSessions();
        return;
    }
    
    const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
    const currentSession = sessions.find(s => s.id === currentSessionId);
    
    if (currentSession) {
        loadSessionMessages(currentSession);
        
        // Update chat title
        const chatTitle = document.getElementById('current-chat-title');
        if (chatTitle) {
            chatTitle.textContent = currentSession.title;
        }
    } else {
        // Fallback to old method for backward compatibility
        const chatBox = document.getElementById('chat-box');
        const savedMessages = localStorage.getItem(`capycare_chat_messages_${userId}`);
        
        if (savedMessages) {
            try {
                const messages = JSON.parse(savedMessages);
                chatBox.innerHTML = '';
                if (messages.length === 0) {
                    addMessageToUI('bot', getWelcomeMessage());
                } else {
                    messages.forEach(msg => {
                        addMessageToUI(msg.sender, msg.text, msg.isHtml, msg.mood);
                    });
                }
                console.log('Chat history loaded from localStorage');
            } catch (error) {
                console.error('Error loading chat history:', error);
                chatBox.innerHTML = '';
                addMessageToUI('bot', getWelcomeMessage());
            }
        } else {
            chatBox.innerHTML = '';
            addMessageToUI('bot', getWelcomeMessage());
        }
    }
}

// Save chat messages to localStorage (updated for session management)
function saveChatMessages() {
    saveCurrentSession();
}

function addMessageToUI(sender, text, isHtml = false, mood = 'default') {
    const chatBox = document.getElementById('chat-box');
    if (sender === 'bot') {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', 'bot-message');
        
        // Add mood-based styling
        if (mood && mood !== 'default' && mood !== 'neutral') {
            messageContainer.classList.add(`bot-message-${mood}`);
        }
        
        const icon = document.createElement('img');
        icon.src = 'capy-icon.png';
        icon.alt = 'Capybara Chatbot';
        icon.className = 'chatbot-icon';
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        if (isHtml) {
            messageContent.innerHTML = text;
        } else {
            messageContent.textContent = text;
        }
        messageContainer.appendChild(icon);
        messageContainer.appendChild(messageContent);
        chatBox.appendChild(messageContainer);
    } else if (sender === 'user') {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', 'user-message');
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        if (isHtml) {
            messageContent.innerHTML = text;
        } else {
            messageContent.textContent = text;
        }
        messageContainer.appendChild(messageContent);
        chatBox.appendChild(messageContainer);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Save messages to localStorage after each message
    saveChatMessages();
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessageToUI('user', message);
    userInput.value = '';

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message bot-message typing-indicator';
    typingIndicator.innerHTML = `
        <img src="capy-icon.png" alt="Capybara Chatbot" class="chatbot-icon">
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    document.getElementById('chat-box').appendChild(typingIndicator);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;

    try {
        // Get Gemini API key
        const geminiApiKey = window.geminiApiKey || localStorage.getItem('geminiApiKey');
        if (!geminiApiKey || geminiApiKey === "YOUR_GEMINI_API_KEY") {
            throw new Error('Gemini API key not found. Please configure it in gemini-config.js or enter it when prompted.');
        }

        const systemPrompt = `You are Capy, a friendly and empathetic capybara chatbot. Your goal is to help users feel better through conversation and music therapy.

Your personality: Warm, gentle, slightly playful, and very supportive. Use simple language and occasionally use capybara-themed puns or phrases (e.g., "Let's munch on some good vibes," "You're looking capy-tivating today!").

IMPORTANT INSTRUCTIONS:
1. After each response, analyze the user's mood and respond with one of these mood indicators: [HAPPY], [SAD], [ANXIOUS], [CALM], [ENERGIZED], or [NEUTRAL]
2. If the user seems to need emotional support, offer music recommendations based on their mood
3. CRISIS DETECTION: If the user mentions words like "kill," "die," "suicide," "end it all," "want to die," "hurt myself," "don't want to live," "better off dead," "no reason to live," "give up," "can't take it anymore," "end my life," "self-harm," "cut myself," or similar concerning language, respond with [CRISIS] instead of a mood indicator
4. Keep responses conversational and supportive, focusing on being a good listener

Mood Detection Guidelines:
- [HAPPY]: User expresses joy, excitement, contentment, or positive emotions
- [SAD]: User expresses sadness, grief, loneliness, or negative emotions  
- [ANXIOUS]: User expresses worry, stress, fear, or nervousness
- [CALM]: User expresses peace, relaxation, or tranquility
- [ENERGIZED]: User expresses motivation, enthusiasm, or high energy
- [NEUTRAL]: User's mood is unclear or mixed
- [CRISIS]: User expresses thoughts of self-harm, suicide, or extreme distress

Music Recommendation Guidelines:
- For HAPPY mood: Suggest uplifting pop, rock, or dance music
- For SAD mood: Suggest comforting alternative, folk, or soft rock
- For ANXIOUS mood: Suggest soothing classical, ambient, or meditation music
- For CALM mood: Suggest relaxing piano, classical, or nature sounds
- For ENERGIZED mood: Suggest motivational rock, hip hop, or electronic music

Example response format:
"Your response here... [HAPPY]"

If recommending music, include specific song suggestions with YouTube links when appropriate.`;

        // Make API call to Gemini
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt + '\n\nNow, please respond to the user message in a conversational way.' }]
                },
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        };
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            let botResponse = data.candidates[0].content.parts[0].text;
            
            // Extract mood from response
            let detectedMood = 'neutral';
            const moodMatch = botResponse.match(/\[(HAPPY|SAD|ANXIOUS|CALM|ENERGIZED|NEUTRAL|CRISIS)\]/);
            if (moodMatch) {
                detectedMood = moodMatch[1].toLowerCase();
                // Remove mood indicator from response
                botResponse = botResponse.replace(/\[(HAPPY|SAD|ANXIOUS|CALM|ENERGIZED|NEUTRAL|CRISIS)\]/, '').trim();
            }
            
            // Remove typing indicator
            const typingIndicator = document.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Add bot response to UI with mood styling
            addMessageToUI('bot', botResponse, false, detectedMood);
            
            // Add music recommendation for any detected mood (except crisis)
            if (detectedMood !== 'neutral' && detectedMood !== 'crisis') {
                setTimeout(() => {
                    const musicRecommendation = getMusicRecommendation(detectedMood);
                    addMessageToUI('bot', musicRecommendation, true, detectedMood);
                }, 1000);
            }
            
            // Add crisis support if crisis is detected
            if (detectedMood === 'crisis') {
                setTimeout(() => {
                    const crisisSupport = getCrisisSupport();
                    addMessageToUI('bot', crisisSupport, true, 'crisis');
                }, 1000);
            }
            
        } else {
            throw new Error('Invalid response format from API');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        
        // Show error message
        addMessageToUI('bot', `Sorry, I'm having trouble responding right now. Please try again later. Error: ${error.message}`);
    }
}

// Clear current chat messages
function clearCurrentChat() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userId = user.uid || 'anonymous';
    
    if (confirm('Are you sure you want to clear this chat? This will remove all messages but keep the chat session.')) {
        const currentSessionId = localStorage.getItem(`capycare_current_session_${userId}`);
        if (!currentSessionId) return;
        
        const sessions = JSON.parse(localStorage.getItem(`capycare_sessions_${userId}`) || '[]');
        const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        
        if (currentSessionIndex !== -1) {
            // Clear messages but keep the session
            sessions[currentSessionIndex].messages = [];
            sessions[currentSessionIndex].title = 'New Chat';
            localStorage.setItem(`capycare_sessions_${userId}`, JSON.stringify(sessions));
            
            // Clear chat box and show welcome message
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML = '';
            addMessageToUI('bot', getWelcomeMessage());
            
            // Update chat title
            const chatTitle = document.getElementById('current-chat-title');
            if (chatTitle) {
                chatTitle.textContent = 'New Chat';
            }
            
            showNotification('Chat cleared! 🧹', 'success');
        }
    }
}

// Update user info display
function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('capycare_user') || '{}');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    
    console.log('Updating user info:', user); // Debug log
    
    if (userAvatar) {
        if (user.email) {
            userAvatar.textContent = user.email.charAt(0).toUpperCase();
        } else {
            userAvatar.textContent = 'U';
        }
    }
    
    if (userName) {
        if (user.email) {
            // Show email, but truncate if too long
            const email = user.email;
            if (email.length > 20) {
                userName.textContent = email.substring(0, 17) + '...';
            } else {
                userName.textContent = email;
            }
        } else {
            userName.textContent = 'User';
        }
    }
}

// Debug function to export chat history (for testing)
function exportChatHistory() {
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const exportData = {
        exportDate: new Date().toISOString(),
        totalSessions: sessions.length,
        sessions: sessions
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `capycare-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Chat history exported! 📁', 'success');
}

// Debug function to show session info in console
function debugSessions() {
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const currentSessionId = localStorage.getItem('capycare_current_session');
    
    console.log('=== CapyCare Session Debug ===');
    console.log('Total sessions:', sessions.length);
    console.log('Current session ID:', currentSessionId);
    console.log('Sessions:', sessions);
    
    sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
            id: session.id,
            title: session.title,
            messageCount: session.messages ? session.messages.length : 0,
            timestamp: new Date(session.timestamp).toLocaleString(),
            isCurrent: session.id === currentSessionId
        });
    });
}

// Show mental health tips
function showMentalHealthTips() {
    const tips = [
        "🌱 Take deep breaths: Inhale for 4 counts, hold for 4, exhale for 4. Repeat 5 times.",
        "🚶‍♀️ Go for a short walk: Even 10 minutes of movement can boost your mood.",
        "💧 Stay hydrated: Drink a glass of water - dehydration can affect your mood.",
        "☀️ Get some sunlight: Natural light helps regulate your circadian rhythm.",
        "🎵 Listen to calming music: Create a playlist of songs that make you feel good.",
        "📝 Write it down: Journal your thoughts and feelings to process them better.",
        "🤗 Reach out: Text or call a friend or family member you trust.",
        "🧘‍♀️ Try mindfulness: Focus on the present moment, notice your surroundings.",
        "😴 Prioritize sleep: Aim for 7-9 hours of quality sleep each night.",
        "🍎 Eat well: Nourish your body with healthy foods that support brain health.",
        "🎨 Express yourself: Draw, paint, or create something that brings you joy.",
        "🐕 Pet an animal: Spending time with pets can reduce stress and anxiety.",
        "🌿 Practice gratitude: Write down 3 things you're thankful for today.",
        "🏃‍♀️ Exercise: Even light exercise releases endorphins that improve mood.",
        "📚 Read something positive: Choose uplifting books or articles.",
        "📞 Crisis Support: If you're in crisis, call 988 (US) or your local crisis hotline immediately.",
        "🏥 Professional Help: Consider talking to a therapist or counselor. Many offer sliding scale fees.",
        "💼 Employee Assistance: Check if your workplace offers free counseling through EAP programs.",
        "🎓 Student Services: If you're a student, your school likely offers free mental health services.",
        "🌐 Online Therapy: Platforms like BetterHelp, Talkspace, or 7 Cups offer online counseling.",
        "🏥 Insurance Coverage: Check your health insurance for mental health benefits and covered providers.",
        "📱 Mental Health Apps: Try apps like Headspace, Calm, or Woebot for guided support.",
        "👥 Support Groups: Look for local or online support groups for specific challenges.",
        "🏛️ Community Centers: Many community centers offer low-cost or free mental health services.",
        "📋 Self-Assessment: Take online mental health screenings to better understand your needs.",
        "🔍 Find a Therapist: Use Psychology Today's therapist finder or ask your doctor for referrals."
    ];
    
    // Get a random tip
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    // Add the tip as a bot message
    addMessageToUI('bot', `<div style="line-height: 1.6;">
<h4 style="color: #d97706; margin-bottom: 10px;">💡 Mental Health Tip:</h4>
<p style="margin: 8px 0; font-size: 16px;">${randomTip}</p>
<p style="margin: 15px 0 0 0; font-style: italic; color: #6b7280;">Remember, seeking help is a sign of strength, not weakness. You don't have to face challenges alone! 🦫</p>
</div>`, true);
    
    // Show notification
    showNotification('Mental health tip shared! 💡', 'success');
}

// Show comprehensive mental health support information
function showMentalHealthSupport() {
    const supportInfo = `<div style="line-height: 1.6;">
<h3 style="color: #dc2626; margin-bottom: 15px;">🆘 Mental Health Support</h3>

<h4 style="color: #d97706; margin: 10px 0 5px 0;">Crisis Support:</h4>
<ul style="margin: 5px 0; padding-left: 20px;">
<li><strong>988</strong> - Suicide & Crisis Lifeline (US)</li>
<li><strong>911</strong> - Emergency Services</li>
<li><strong>Crisis Text Line</strong>: Text HOME to 741741</li>
</ul>

<h4 style="color: #d97706; margin: 10px 0 5px 0;">Find Professional Help:</h4>
<ul style="margin: 5px 0; padding-left: 20px;">
<li><strong>Psychology Today</strong> - Find therapists near you</li>
<li><strong>BetterHelp/Talkspace</strong> - Online therapy</li>
<li><strong>Insurance</strong> - Check your coverage for mental health</li>
<li><strong>Work/School</strong> - Ask about EAP or student services</li>
</ul>

<h4 style="color: #d97706; margin: 10px 0 5px 0;">Support Resources:</h4>
<ul style="margin: 5px 0; padding-left: 20px;">
<li><strong>NAMI</strong> - Support groups and resources</li>
<li><strong>Mental Health Apps</strong> - Headspace, Calm, Woebot</li>
<li><strong>Community Centers</strong> - Low-cost local services</li>
</ul>

<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 12px 0; border-left: 4px solid #f59e0b;">
<p style="margin: 5px 0;"><strong>Remember:</strong> Seeking help is a sign of strength! You deserve support. 🦫</p>
</div>

<p style="margin: 8px 0;"><strong>Next Steps:</strong> Start with one resource that feels right for you. You're not alone! 💙</p>
</div>`;

    addMessageToUI('bot', supportInfo, true); // true for HTML content
    showNotification('Mental health support information shared! 🆘', 'info');
}

// Add event listener for comprehensive support (you can add this to a new button or modify existing one)
function addSupportButton() {
    const supportBtn = document.createElement('button');
    supportBtn.className = 'icon-btn';
    supportBtn.innerHTML = '<span>🆘</span>';
    supportBtn.title = 'Mental Health Support & Resources';
    supportBtn.addEventListener('click', showMentalHealthSupport);
    
    // Add to input icons if it exists
    const inputIcons = document.querySelector('.input-icons');
    if (inputIcons) {
        inputIcons.appendChild(supportBtn);
    }
}

// Get music recommendations based on mood
function getMusicRecommendation(mood) {
    const musicRecommendations = {
        happy: {
            title: "🎵 Uplifting Music to Keep the Good Vibes Going",
            songs: [
                {
                    name: "Happy - Pharrell Williams",
                    youtube: "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
                    spotify: "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH"
                },
                {
                    name: "Good Life - OneRepublic",
                    youtube: "https://www.youtube.com/watch?v=1Y8MxD6mcDk",
                    spotify: "https://open.spotify.com/track/5sFpVW8NRLhsSkc58YzUkL"
                },
                {
                    name: "Walking on Sunshine - Katrina & The Waves",
                    youtube: "https://www.youtube.com/watch?v=iPUmE-tne5U",
                    spotify: "https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0"
                }
            ],
            message: "Keep that wonderful energy flowing! These songs will help maintain your positive mood. 🌟"
        },
        sad: {
            title: "🎵 Music for When You're Feeling Down",
            songs: [
                {
                    name: "Fix You - Coldplay",
                    youtube: "https://www.youtube.com/watch?v=k4V3Mo61fJM",
                    spotify: "https://open.spotify.com/track/7LVHVU3tWfcxj5aiPFEW4Q"
                },
                {
                    name: "The Scientist - Coldplay", 
                    youtube: "https://www.youtube.com/watch?v=RB-RcX5DS5A",
                    spotify: "https://open.spotify.com/track/75JFxkI2RXiU7L9VXzMkle"
                },
                {
                    name: "Skinny Love - Bon Iver",
                    youtube: "https://www.youtube.com/watch?v=8jLOxVEhIqI",
                    spotify: "https://open.spotify.com/track/3B3eOgLJSqPEA0RfboIQVM"
                }
            ],
            message: "Here are some comforting songs that might help lift your spirits. Sometimes music can be the best companion when we're feeling down. 💙"
        },
        anxious: {
            title: "🎵 Calming Music for Anxiety Relief",
            songs: [
                {
                    name: "Claire de Lune - Debussy",
                    youtube: "https://www.youtube.com/watch?v=CvFH_6DNRCY",
                    spotify: "https://open.spotify.com/track/0Qa0dEJOE9Qf1mUj8uYwM5"
                },
                {
                    name: "Weightless - Marconi Union",
                    youtube: "https://www.youtube.com/watch?v=UfcAVejslrU",
                    spotify: "https://open.spotify.com/track/3b8UGLqUT1c3bCfXthzazt"
                },
                {
                    name: "River Flows in You - Yiruma",
                    youtube: "https://www.youtube.com/watch?v=7maJOI3QMu0",
                    spotify: "https://open.spotify.com/track/7ySbfLwdCwl1EM0zNCJZ38"
                }
            ],
            message: "These soothing melodies can help calm your mind and reduce anxiety. Take deep breaths while listening. 🌸"
        },
        calm: {
            title: "🎵 Peaceful Music for Relaxation",
            songs: [
                {
                    name: "Gymnopedie No. 1 - Erik Satie",
                    youtube: "https://www.youtube.com/watch?v=S-Xm7s9eGxU",
                    spotify: "https://open.spotify.com/track/6i0VQ9G8jfqnaqF0uPRrLP"
                },
                {
                    name: "Canon in D - Pachelbel",
                    youtube: "https://www.youtube.com/watch?v=NlprozGcs80",
                    spotify: "https://open.spotify.com/track/5I8tOvK2eI8txD5XlHvdT7"
                },
                {
                    name: "Moonlight Sonata - Beethoven",
                    youtube: "https://www.youtube.com/watch?v=4Tr0otuiQuU",
                    spotify: "https://open.spotify.com/track/1T2oKqZv89zJPOu5e2fvWc"
                }
            ],
            message: "Perfect music to maintain your peaceful state of mind. Let these gentle melodies wash over you. 🍃"
        },
        energized: {
            title: "🎵 High-Energy Music to Keep You Motivated",
            songs: [
                {
                    name: "Eye of the Tiger - Survivor",
                    youtube: "https://www.youtube.com/watch?v=btPJPFnesV4",
                    spotify: "https://open.spotify.com/track/2KH16WveTQWT6KOG9Rg6e2"
                },
                {
                    name: "We Will Rock You - Queen",
                    youtube: "https://www.youtube.com/watch?v=-tJYN-eG1zk",
                    spotify: "https://open.spotify.com/track/54flyrjcdnQdco7300avMJ"
                },
                {
                    name: "Lose Yourself - Eminem",
                    youtube: "https://www.youtube.com/watch?v=_Yhyp-_hX2s",
                    spotify: "https://open.spotify.com/track/5Z01UMMf7V1o0MzF86s6WJ"
                }
            ],
            message: "Channel that energy into something amazing! These songs will keep your motivation high. ⚡"
        }
    };

    const recommendation = musicRecommendations[mood];
    if (!recommendation) return '';

    let html = `<div style="background: #fef3c7; padding: 15px; border-radius: 10px; border-left: 4px solid #f59e0b; margin: 10px 0;">
        <h4 style="color: #d97706; margin: 0 0 10px 0;">${recommendation.title}</h4>
        <p style="margin: 0 0 15px 0; color: #374151;">${recommendation.message}</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">`;

    recommendation.songs.forEach(song => {
        html += `
            <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">${song.name}</div>
                <div style="display: flex; gap: 8px;">
                    <a href="${song.youtube}" target="_blank" style="background: #ff0000; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;">YouTube</a>
                    <a href="${song.spotify}" target="_blank" style="background: #1db954; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;">Spotify</a>
                </div>
            </div>`;
    });

    html += `</div>
        <p style="margin: 15px 0 0 0; font-style: italic; color: #6b7280; font-size: 14px;">
            Remember, music is a powerful tool for emotional healing. Let these songs be your companions! 🦫🎵
        </p>
    </div>`;

    return html;
}

// Get crisis support and counseling recommendations
function getCrisisSupport() {
    const crisisSupport = {
        title: "🆘 Immediate Crisis Support",
        message: "I'm here for you, and you're not alone. Your feelings are valid, and there are people who want to help you.",
        resources: [
            {
                name: "988 Suicide & Crisis Lifeline",
                description: "24/7 free and confidential support",
                phone: "988",
                link: "https://988lifeline.org/",
                available: "Available 24/7"
            },
            {
                name: "Crisis Text Line",
                description: "Text for immediate crisis support",
                phone: "Text HOME to 741741",
                link: "https://www.crisistextline.org/",
                available: "Available 24/7"
            },
            {
                name: "Emergency Services",
                description: "For immediate danger",
                phone: "911",
                link: "#",
                available: "Call immediately if in danger"
            }
        ],
        counseling: [
            {
                name: "BetterHelp Online Therapy",
                description: "Professional online counseling",
                link: "https://www.betterhelp.com/",
                cost: "Starting at $60/week"
            },
            {
                name: "Talkspace",
                description: "Licensed therapists online",
                link: "https://www.talkspace.com/",
                cost: "Starting at $69/week"
            },
            {
                name: "7 Cups",
                description: "Free online therapy and support",
                link: "https://www.7cups.com/",
                cost: "Free and paid options"
            },
            {
                name: "Psychology Today",
                description: "Find local therapists",
                link: "https://www.psychologytoday.com/us/therapists",
                cost: "Varies by provider"
            }
        ]
    };

    let html = `<div style="background: linear-gradient(135deg, #fef2f2, #fecaca); padding: 20px; border-radius: 12px; border: 3px solid #dc2626; margin: 15px 0;">
        <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 1.3rem;">${crisisSupport.title}</h3>
        <p style="margin: 0 0 20px 0; color: #374151; font-size: 1.1rem; line-height: 1.6;">${crisisSupport.message}</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h4 style="color: #dc2626; margin: 0 0 12px 0;">🚨 Immediate Crisis Resources</h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">`;

    crisisSupport.resources.forEach(resource => {
        html += `
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${resource.name}</div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 6px;">${resource.description}</div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${resource.phone}</span>
                    <span style="color: #059669; font-size: 12px; font-weight: 500;">${resource.available}</span>
                </div>
            </div>`;
    });

    html += `</div></div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h4 style="color: #d97706; margin: 0 0 12px 0;">💙 Professional Counseling Options</h4>
            <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">These services can provide ongoing support and professional help:</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">`;

    crisisSupport.counseling.forEach(service => {
        html += `
            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${service.name}</div>
                        <div style="color: #6b7280; font-size: 13px;">${service.description}</div>
                        <div style="color: #059669; font-size: 12px; font-weight: 500;">${service.cost}</div>
                    </div>
                    <a href="${service.link}" target="_blank" style="background: #f59e0b; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 500;">Visit</a>
                </div>
            </div>`;
    });

    html += `</div></div>
        
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 500; font-size: 14px;">
                💙 <strong>Remember:</strong> You are not alone, and your life has value. Reaching out for help is a sign of strength, not weakness. 
                There are people who care about you and want to support you through this difficult time.
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px; font-style: italic;">
                CapyCare is here to support you, but professional help is essential for crisis situations. 🦫💙
            </p>
        </div>
    </div>`;

    return html;
}

// Dark mode toggle functionality
function toggleDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    
    // Update toggle button icon
    if (darkModeToggle) {
        darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        darkModeToggle.title = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
    
    // Save preference to localStorage
    localStorage.setItem('capycare_dark_mode', isDarkMode);
    
    // Show notification
    const mode = isDarkMode ? 'Dark' : 'Light';
    showNotification(`${mode} mode activated! ${isDarkMode ? '🌙' : '☀️'}`, 'success');
}

// Initialize dark mode state on page load
function initializeDarkMode() {
    const savedDarkMode = localStorage.getItem('capycare_dark_mode') === 'true';
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.textContent = '☀️';
            darkModeToggle.title = 'Switch to Light Mode';
        }
    }
} 