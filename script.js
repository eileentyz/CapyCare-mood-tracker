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

// Initialize chat sessions management
function initializeChatSessions() {
    // Get or create sessions array
    let sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    
    // If no sessions exist, create a default one
    if (sessions.length === 0) {
        const defaultSession = {
            id: generateSessionId(),
            title: 'New Chat',
            timestamp: Date.now(),
            messages: []
        };
        sessions = [defaultSession];
        localStorage.setItem('capycare_sessions', JSON.stringify(sessions));
    }
    
    // Set current session to the most recent one
    const currentSessionId = localStorage.getItem('capycare_current_session');
    if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
        localStorage.setItem('capycare_current_session', sessions[0].id);
    }
    
    updateSessionsList();
}

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update the sessions list in the sidebar
function updateSessionsList() {
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const currentSessionId = localStorage.getItem('capycare_current_session');
    
    // Find or create chat history container
    let chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) {
        chatHistory = document.createElement('div');
        chatHistory.className = 'chat-history';
        const sidebar = document.querySelector('.sidebar');
        const sidebarHeader = document.querySelector('.sidebar-header');
        sidebar.insertBefore(chatHistory, sidebarHeader.nextSibling);
    }
    
    chatHistory.innerHTML = '';
    
    sessions.forEach(session => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${session.id === currentSessionId ? 'active' : ''}`;
        
        // Calculate message count
        const messageCount = session.messages ? session.messages.length : 0;
        const userMessageCount = session.messages ? session.messages.filter(msg => msg.sender === 'user').length : 0;
        
        // Format timestamp
        const timestamp = new Date(session.timestamp).toLocaleDateString();
        
        chatItem.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <div class="chat-item-content">
                <span class="chat-item-title">${session.title}</span>
                <span class="chat-item-meta">${userMessageCount} messages • ${timestamp}</span>
            </div>
            <button class="delete-session-btn" data-session-id="${session.id}" title="Delete chat">×</button>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-session-btn')) {
                switchToSession(session.id);
            }
        });
        
        chatHistory.appendChild(chatItem);
    });
    
    // Add delete session event listeners
    document.querySelectorAll('.delete-session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(btn.dataset.sessionId);
        });
    });
}

// Switch to a specific chat session
function switchToSession(sessionId) {
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
        // Save current session before switching
        saveCurrentSession();
        
        // Switch to new session
        localStorage.setItem('capycare_current_session', sessionId);
        
        // Load session messages
        loadSessionMessages(session);
        
        // Update UI
        updateSessionsList();
        
        // Update chat title
        const chatTitle = document.getElementById('current-chat-title');
        if (chatTitle) {
            chatTitle.textContent = session.title;
        }
    }
}

// Save current session messages
function saveCurrentSession() {
    const currentSessionId = localStorage.getItem('capycare_current_session');
    if (!currentSessionId) return;
    
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
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
            title = firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '');
        } else if (messages.length > 0) {
            // If no user message but there are bot messages, use a generic title
            title = 'Chat ' + new Date().toLocaleDateString();
        }
        
        sessions[currentSessionIndex].messages = messages;
        sessions[currentSessionIndex].title = title;
        sessions[currentSessionIndex].lastUpdated = Date.now();
        
        localStorage.setItem('capycare_sessions', JSON.stringify(sessions));
        
        // Log for debugging
        console.log('Session saved:', currentSessionId);
        console.log('Messages saved:', messages.length);
        console.log('Session title:', title);
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
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const currentSessionId = localStorage.getItem('capycare_current_session');
    
    if (sessions.length <= 1) {
        alert('You need at least one chat session. Create a new chat first!');
        return;
    }
    
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        localStorage.setItem('capycare_sessions', JSON.stringify(updatedSessions));
        
        // If we deleted the current session, switch to the first available one
        if (sessionId === currentSessionId) {
            localStorage.setItem('capycare_current_session', updatedSessions[0].id);
            loadSessionMessages(updatedSessions[0]);
        }
        
        updateSessionsList();
    }
}

// Enhanced new chat function
function startNewChat() {
    // Save current session before creating new one
    saveCurrentSession();
    
    // Get current sessions
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
    const currentSessionId = localStorage.getItem('capycare_current_session');
    
    // Update the title of the current session before creating new one
    if (currentSessionId) {
        const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        if (currentSessionIndex !== -1) {
            // Update title based on first user message if it exists
            const currentSession = sessions[currentSessionIndex];
            if (currentSession.messages && currentSession.messages.length > 0) {
                const firstUserMessage = currentSession.messages.find(msg => msg.sender === 'user');
                if (firstUserMessage) {
                    currentSession.title = firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '');
                } else {
                    currentSession.title = 'Chat ' + new Date(currentSession.timestamp).toLocaleDateString();
                }
            } else {
                currentSession.title = 'Empty Chat';
            }
            currentSession.lastUpdated = Date.now();
        }
    }
    
    // Create new session
    const newSession = {
        id: generateSessionId(),
        title: 'New Chat',
        timestamp: Date.now(),
        messages: []
    };
    
    // Add new session to beginning of array (most recent first)
    sessions.unshift(newSession);
    localStorage.setItem('capycare_sessions', JSON.stringify(sessions));
    
    // Switch to new session
    localStorage.setItem('capycare_current_session', newSession.id);
    
    // Clear chat box and show welcome message
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    addMessageToUI('bot', getWelcomeMessage());
    
    // Update UI
    updateSessionsList();
    
    // Update chat title
    const chatTitle = document.getElementById('current-chat-title');
    if (chatTitle) {
        chatTitle.textContent = 'New Chat';
    }
    
    // Show success message with session count
    const sessionCount = sessions.length;
    showNotification(`New chat started! You now have ${sessionCount} chat${sessionCount > 1 ? 's' : ''} in your history 🦫`, 'success');
    
    // Log for debugging
    console.log('New chat created:', newSession.id);
    console.log('Total sessions:', sessions.length);
    console.log('Current session:', newSession.id);
}

// Enhanced logout function
function logout() {
    if (confirm('Are you sure you want to logout? Your chat sessions will be saved.')) {
        // Save current session before logout
        saveCurrentSession();
        
        // Clear user data (but keep chat sessions for now)
        localStorage.removeItem('capycare_user');
        localStorage.removeItem('capycare_current_session');
        
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
    const currentSessionId = localStorage.getItem('capycare_current_session');
    if (!currentSessionId) {
        initializeChatSessions();
        return;
    }
    
    const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
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
        const savedMessages = localStorage.getItem('capycare_chat_messages');
        
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

        const systemPrompt = `You are Capy, a friendly and empathetic capybara chatbot. Your goal is to help users feel better.

Your personality: Warm, gentle, slightly playful, and very supportive. Use simple language and occasionally use capybara-themed puns or phrases (e.g., "Let's munch on some good vibes," "You're looking capy-tivating today!").

Keep your responses short, conversational, and supportive. Focus on being a good listener and offering simple encouragement.`;

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
            const botResponse = data.candidates[0].content.parts[0].text;
            
            // Remove typing indicator
            const typingIndicator = document.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Add bot response to UI
            addMessageToUI('bot', botResponse);
            
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
    if (confirm('Are you sure you want to clear this chat? This will remove all messages but keep the chat session.')) {
        const currentSessionId = localStorage.getItem('capycare_current_session');
        if (!currentSessionId) return;
        
        const sessions = JSON.parse(localStorage.getItem('capycare_sessions') || '[]');
        const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        
        if (currentSessionIndex !== -1) {
            // Clear messages but keep the session
            sessions[currentSessionIndex].messages = [];
            sessions[currentSessionIndex].title = 'New Chat';
            localStorage.setItem('capycare_sessions', JSON.stringify(sessions));
            
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