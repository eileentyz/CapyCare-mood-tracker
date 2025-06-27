document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let user;
    let conversationHistory = [];
    let currentMood = 'default'; // Track the current mood for styling

    // Load saved chat history from localStorage
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('capycare_chat_history');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                conversationHistory = parsedHistory.conversationHistory || [];
                currentMood = parsedHistory.currentMood || 'default';
                
                // Restore chat messages to the UI
                if (parsedHistory.messages && parsedHistory.messages.length > 0) {
                    chatBox.innerHTML = ''; // Clear existing messages
                    parsedHistory.messages.forEach(msg => {
                        addMessageToUI(msg.sender, msg.text, msg.isHtml, msg.mood);
                    });
                }
                
                console.log('Chat history loaded from localStorage');
            } catch (error) {
                console.error('Error loading chat history:', error);
                // If there's an error, start fresh
                conversationHistory = [];
                currentMood = 'default';
            }
        }
    }

    // Save chat history to localStorage
    function saveChatHistory() {
        try {
            // Get all current messages from the chat box
            const messages = [];
            const messageElements = chatBox.querySelectorAll('.chat-message');
            
            messageElements.forEach(element => {
                const isBot = element.classList.contains('bot-message');
                const sender = isBot ? 'bot' : 'user';
                const text = element.innerHTML || element.textContent;
                const isHtml = element.innerHTML !== element.textContent;
                
                // Determine mood from bot message classes
                let mood = 'default';
                if (isBot) {
                    if (element.classList.contains('bot-message-happy')) mood = 'happy';
                    else if (element.classList.contains('bot-message-sad')) mood = 'sad';
                    else if (element.classList.contains('bot-message-anxious')) mood = 'anxious';
                    else if (element.classList.contains('bot-message-calm')) mood = 'calm';
                    else if (element.classList.contains('bot-message-energized')) mood = 'energized';
                }
                
                messages.push({ sender, text, isHtml, mood });
            });
            
            const chatData = {
                conversationHistory,
                currentMood,
                messages,
                timestamp: Date.now()
            };
            
            localStorage.setItem('capycare_chat_history', JSON.stringify(chatData));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    // Clear chat history
    function clearChatHistory() {
        localStorage.removeItem('capycare_chat_history');
        conversationHistory = [];
        currentMood = 'default';
        chatBox.innerHTML = '';
    }

    const systemPrompt = `You are Capy, a friendly and empathetic capybara chatbot. Your goal is to help users feel better.

    Your personality: Warm, gentle, slightly playful, and very supportive. Use simple language and occasionally use capybara-themed puns or phrases (e.g., "Let's munch on some good vibes," "You're looking capy-tivating today!").

    Your tasks:
    1.  **Understand Mood**: First, understand the user's mood from their message (e.g., happy, sad, anxious, calm, energized).
    2.  **Detect Need for Check-in**: If a user expresses feelings of being overwhelmed, hopeless, consistently very sad, or mentions depression, prioritize this.
    3.  **Function Call for Check-in**: If a check-in is needed, you MUST respond ONLY with the following JSON format:
        \`\`\`json
        {
          "action": "suggest_check_in"
        }
        \`\`\`
    4.  **Confirm and Ask for Song**: If no check-in is needed, and you identify a clear mood, confirm it with the user and ask if they'd like a song suggestion.
    5.  **Function Call for Song**: If they say yes to a song, you MUST respond ONLY with the following JSON format:
        \`\`\`json
        {
          "action": "suggest_song",
          "mood": "DetectedMood"
        }
        \`\`\`
        Replace "DetectedMood" with the mood you identified (e.g., "Happy", "Sad", "Anxious", "Calm", "Energized"). Do not include any other text outside this JSON object.
    6.  **Chat and Advise**: If they say no to a song, or after you've suggested one, continue the conversation by offering simple, encouraging advice relevant to their mood.
    7.  **Keep it Brief**: Keep your text responses short and conversational.
    
    **Disclaimer**: Always remember you are an AI, not a healthcare professional. Do not give medical advice. Your goal is to be a supportive friend.`;
    
    // --- Authentication ---
    auth.onAuthStateChanged(currentUser => {
        if (currentUser) {
            user = currentUser;
            // Load chat history after user is authenticated
            loadChatHistory();
            
            // Only show welcome message if no previous conversation exists
            if (conversationHistory.length === 0) {
                addMessage('bot', "Hi there! I'm Capy, your personal companion. It's great to see you. How are you feeling today?");
            } else {
                // If there's existing conversation, just scroll to bottom
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    logoutBtn.addEventListener('click', () => {
        // Clear chat history on logout
        clearChatHistory();
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // Clear chat button
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
                clearChatHistory();
                addMessage('bot', "Hi there! I'm Capy, your personal companion. It's great to see you. How are you feeling today?");
            }
        });
    }

    // Add mental health tips icon button functionality
    const tipsIconBtn = document.getElementById('tips-icon-btn');
    if (tipsIconBtn) {
        tipsIconBtn.addEventListener('click', () => {
            addMessage('bot', `
                <strong>Mental Health Tips:</strong><br>
                • Take a deep breath and pause.<br>
                • Talk to someone you trust.<br>
                • Go for a short walk.<br>
                • Practice gratitude.<br>
                • If you need help, consider reaching out to a counselor or helpline.<br>
                <a href="https://www.befrienders.org/" target="_blank" style="color:#3b82f6;">Find support near you</a>
            `, true);
        });
    }

    // --- Chat Logic ---
    sendBtn.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    async function handleUserInput() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        addMessage('user', messageText);
        userInput.value = '';
        
        addMessageToHistory('user', messageText);
        await getAIResponse();
    }

    async function getAIResponse() {
        console.log("Getting AI response...");
        const apiKey = window.geminiApiKey;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
            addMessage("bot", "It looks like the AI is not configured. Please add a valid Gemini API key in `gemini-config.js`.");
            return;
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: conversationHistory,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                // An equivalent to Temperature, but for the new models
                "temperature": 1,
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Response:", errorBody);
                throw new Error(`API Error: ${response.status}`);
            }

            const responseData = await response.json();

            if (!responseData.candidates || responseData.candidates.length === 0) {
                 console.error("No candidates in response:", responseData);
                 throw new Error("AI did not provide a response candidate.");
            }

            const botResponse = responseData.candidates[0].content.parts[0].text;
            
            addMessageToHistory('model', botResponse);

            // Check if the response is a JSON action
            let jsonResponse = null;
            const jsonMatch = botResponse.match(/\{[\s\S]*\}/); // Find text between { and }

            if (jsonMatch && jsonMatch[0]) {
                try {
                    jsonResponse = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error("Failed to parse potential JSON:", e);
                    jsonResponse = null; // It wasn't valid JSON, so treat as text
                }
            }
            
            if (jsonResponse && jsonResponse.action === 'suggest_song') {
                const mood = jsonResponse.mood;
                currentMood = mood.toLowerCase(); // Set the mood for styling
                addMessage('bot', `I can see you're feeling ${currentMood}. Let me find a song for you.`);
                await findAndPlaySong(mood);
            } else if (jsonResponse && jsonResponse.action === 'suggest_check_in') {
                currentMood = 'sad'; // Use 'sad' styling for check-ins
                addMessage('bot', "It sounds like things are really tough right now. Sometimes, talking to someone can make a world of difference.");
                addMessage('bot', "Remember, it's okay to ask for help. You can connect with people who can support you by calling or texting 988 in the US and Canada, or by visiting the [988 Lifeline website](https://988lifeline.org/). You're not alone in this.", true);
            } else {
                // Not a JSON action, or parsing failed, so it's a regular chat message
                addMessage('bot', botResponse);
            }

        } catch (error) {
            console.error("AI Error:", error);
            addMessage("bot", "I'm having a little trouble thinking right now. Please try again in a moment.");
        }
    }

    async function findAndPlaySong(mood) {
        // Curated song recommendations with playable sources
        const songRecommendations = {
            happy: [
                { 
                    title: "Happy", 
                    artist: "Pharrell Williams", 
                    genre: "Pop",
                    youtubeId: "ZbZSe6N_BXs",
                    spotifyUrl: "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH"
                },
                { 
                    title: "Good Life", 
                    artist: "OneRepublic", 
                    genre: "Pop Rock",
                    youtubeId: "h-pFUljFVeM",
                    spotifyUrl: "https://open.spotify.com/track/5EciRz1TbGxRvlJ9Cy2Gre"
                },
                { 
                    title: "Walking on Sunshine", 
                    artist: "Katrina & The Waves", 
                    genre: "Pop",
                    youtubeId: "iPUmE-tne5U",
                    spotifyUrl: "https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0"
                },
                { 
                    title: "Don't Stop Believin'", 
                    artist: "Journey", 
                    genre: "Rock",
                    youtubeId: "1k8craCGp9U",
                    spotifyUrl: "https://open.spotify.com/track/4bHsxqR3GMrXTxEPL5vYe1"
                },
                { 
                    title: "I Gotta Feeling", 
                    artist: "The Black Eyed Peas", 
                    genre: "Pop",
                    youtubeId: "uSD4vsh1zBA",
                    spotifyUrl: "https://open.spotify.com/track/2H1047e0oMSj10dgp7p2VG"
                }
            ],
            sad: [
                { 
                    title: "Fix You", 
                    artist: "Coldplay", 
                    genre: "Alternative Rock",
                    youtubeId: "k4V3Mo61fJM",
                    spotifyUrl: "https://open.spotify.com/track/7LVHVU3tWfcxj5aiPFEW4Q"
                },
                { 
                    title: "The Scientist", 
                    artist: "Coldplay", 
                    genre: "Alternative Rock",
                    youtubeId: "RB-RcX5DS5A",
                    spotifyUrl: "https://open.spotify.com/track/75JFxkI2RXiU7L9VXzMkle"
                },
                { 
                    title: "Mad World", 
                    artist: "Gary Jules", 
                    genre: "Alternative",
                    youtubeId: "4N3N1MlvVc4",
                    spotifyUrl: "https://open.spotify.com/track/3JOVTaI5DrKJmbyfcGX1y2"
                },
                { 
                    title: "Everybody Hurts", 
                    artist: "R.E.M.", 
                    genre: "Alternative Rock",
                    youtubeId: "ijZRCIrTgQc",
                    spotifyUrl: "https://open.spotify.com/track/4tCWPkNm9Dx1x52v65aByu"
                },
                { 
                    title: "Hallelujah", 
                    artist: "Jeff Buckley", 
                    genre: "Folk Rock",
                    youtubeId: "y8AWFf7EAc4",
                    spotifyUrl: "https://open.spotify.com/track/3pRaLNL3b8x5uBOcsSVvdT"
                }
            ],
            anxious: [
                { 
                    title: "Weightless", 
                    artist: "Marconi Union", 
                    genre: "Ambient",
                    youtubeId: "UfcAVejslrU",
                    spotifyUrl: "https://open.spotify.com/track/3r8RuvgbX9s7ammBn07D3W"
                },
                { 
                    title: "Claire de Lune", 
                    artist: "Debussy", 
                    genre: "Classical",
                    youtubeId: "CvFH_6DNRCY",
                    spotifyUrl: "https://open.spotify.com/track/0QqjruHZtBmzJ5d5HnUjE5"
                },
                { 
                    title: "River Flows in You", 
                    artist: "Yiruma", 
                    genre: "Piano",
                    youtubeId: "7maJOI3QMu0",
                    spotifyUrl: "https://open.spotify.com/track/2qpsUQ1Gz9Zmi7OftCaKzE"
                },
                { 
                    title: "Gymnopedie No. 1", 
                    artist: "Erik Satie", 
                    genre: "Classical",
                    youtubeId: "S-Xm7s9eGxU",
                    spotifyUrl: "https://open.spotify.com/track/6uVJEdPkrJ7exb7Tg4zNAf"
                },
                { 
                    title: "The Sound of Silence", 
                    artist: "Disturbed", 
                    genre: "Rock",
                    youtubeId: "u9Dg-g7t2l4",
                    spotifyUrl: "https://open.spotify.com/track/1j8z4TTjJ1YOdoFEDwJTQa"
                }
            ],
            calm: [
                { 
                    title: "Weightless", 
                    artist: "Marconi Union", 
                    genre: "Ambient",
                    youtubeId: "UfcAVejslrU",
                    spotifyUrl: "https://open.spotify.com/track/3r8RuvgbX9s7ammBn07D3W"
                },
                { 
                    title: "Claire de Lune", 
                    artist: "Debussy", 
                    genre: "Classical",
                    youtubeId: "CvFH_6DNRCY",
                    spotifyUrl: "https://open.spotify.com/track/0QqjruHZtBmzJ5d5HnUjE5"
                },
                { 
                    title: "River Flows in You", 
                    artist: "Yiruma", 
                    genre: "Piano",
                    youtubeId: "7maJOI3QMu0",
                    spotifyUrl: "https://open.spotify.com/track/2qpsUQ1Gz9Zmi7OftCaKzE"
                },
                { 
                    title: "Gymnopedie No. 1", 
                    artist: "Erik Satie", 
                    genre: "Classical",
                    youtubeId: "S-Xm7s9eGxU",
                    spotifyUrl: "https://open.spotify.com/track/6uVJEdPkrJ7exb7Tg4zNAf"
                },
                { 
                    title: "The Sound of Silence", 
                    artist: "Disturbed", 
                    genre: "Rock",
                    youtubeId: "u9Dg-g7t2l4",
                    spotifyUrl: "https://open.spotify.com/track/1j8z4TTjJ1YOdoFEDwJTQa"
                }
            ],
            energized: [
                { 
                    title: "Eye of the Tiger", 
                    artist: "Survivor", 
                    genre: "Rock",
                    youtubeId: "btPJPFnesV4",
                    spotifyUrl: "https://open.spotify.com/track/2HHtWyy5CgaQbC7XSoOb0e"
                },
                { 
                    title: "We Will Rock You", 
                    artist: "Queen", 
                    genre: "Rock",
                    youtubeId: "-tJYN-eG1zk",
                    spotifyUrl: "https://open.spotify.com/track/54flyrjcdnQdco7300avMJ"
                },
                { 
                    title: "Stronger", 
                    artist: "Kanye West", 
                    genre: "Hip Hop",
                    youtubeId: "PsO6ZnUZI0g",
                    spotifyUrl: "https://open.spotify.com/track/0fBWpe93ON8CqvuobxEk9R"
                },
                { 
                    title: "Lose Yourself", 
                    artist: "Eminem", 
                    genre: "Hip Hop",
                    youtubeId: "xFYQQPAOz7Y",
                    spotifyUrl: "https://open.spotify.com/track/5Z01UMMf7V1o0MzF86s6WJ"
                },
                { 
                    title: "Thunderstruck", 
                    artist: "AC/DC", 
                    genre: "Rock",
                    youtubeId: "v2AC41dglnM",
                    spotifyUrl: "https://open.spotify.com/track/57bgtoPSgt236HzfBOd8kj"
                }
            ]
        };

        const moodLower = mood.toLowerCase();
        const songs = songRecommendations[moodLower] || songRecommendations.happy;
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        
        // Create message with song info
        addMessage('bot', `How about "${randomSong.title}" by ${randomSong.artist}? It's a great ${randomSong.genre} song that might match your ${mood} mood! 🎵`);
        
        // Create music player container
        const playerContainer = document.createElement('div');
        playerContainer.classList.add('chat-message', 'bot-message', 'music-player-container');
        playerContainer.style.marginTop = '10px';
        
        // Create YouTube embed
        const youtubeEmbed = document.createElement('iframe');
        youtubeEmbed.width = '300';
        youtubeEmbed.height = '169';
        youtubeEmbed.src = `https://www.youtube.com/embed/${randomSong.youtubeId}?autoplay=0&controls=1&rel=0`;
        youtubeEmbed.frameBorder = '0';
        youtubeEmbed.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        youtubeEmbed.allowFullscreen = true;
        youtubeEmbed.style.borderRadius = '8px';
        youtubeEmbed.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        
        // Create streaming links
        const streamingLinks = document.createElement('div');
        streamingLinks.style.marginTop = '10px';
        streamingLinks.style.fontSize = '12px';
        streamingLinks.style.color = '#666';
        streamingLinks.innerHTML = `
            <a href="${randomSong.spotifyUrl}" target="_blank" style="color: #1DB954; text-decoration: none; margin-right: 10px;">🎵 Listen on Spotify</a>
            <a href="https://www.youtube.com/watch?v=${randomSong.youtubeId}" target="_blank" style="color: #FF0000; text-decoration: none;">▶️ Watch on YouTube</a>
        `;
        
        playerContainer.appendChild(youtubeEmbed);
        playerContainer.appendChild(streamingLinks);
        
        // Add to chat
        chatBox.appendChild(playerContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // --- Utility Functions ---
    function addMessageToUI(sender, text, isHtml = false, mood = 'default') {
        if (sender === 'bot') {
            // Create a flex row for icon and message bubble
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'flex-end';
            row.style.marginBottom = '8px';

            // Capybara icon
            const icon = document.createElement('img');
            icon.src = 'capy-icon.png';
            icon.alt = 'Capybara Chatbot';
            icon.className = 'chatbot-icon';
            icon.style.marginRight = '8px';

            // Message bubble
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', 'bot-message');
            const moodClass = `bot-message-${mood}`;
            messageElement.classList.add(moodClass);
            if (isHtml) {
                messageElement.innerHTML = text;
            } else {
                messageElement.textContent = text;
            }

            row.appendChild(icon);
            row.appendChild(messageElement);
            chatBox.appendChild(row);
        } else {
            // User message (no icon, normal bubble)
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', 'user-message');
            if (isHtml) {
                messageElement.innerHTML = text;
            } else {
                messageElement.textContent = text;
            }
            chatBox.appendChild(messageElement);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addMessage(sender, text, isHtml = false) {
        addMessageToUI(sender, text, isHtml, currentMood);
        // Save chat history after adding a message
        setTimeout(saveChatHistory, 100);
    }

    function addMessageToHistory(role, text) {
        conversationHistory.push({ role, parts: [{ text }] });
        // Optional: Limit history size to keep API calls from getting too large
        if (conversationHistory.length > 10) {
            conversationHistory.shift(); // Remove the oldest message
        }
        // Save chat history after updating conversation history
        setTimeout(saveChatHistory, 100);
    }
}); 