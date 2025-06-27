document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let user;
    let conversationHistory = [];
    let currentMood = 'default'; // Track the current mood for styling

    const systemPrompt = `You are Capy, a friendly and empathetic capybara chatbot. Your goal is to help users track their mood and feel better.

    Your personality: Warm, gentle, slightly playful, and very supportive. Use simple language and occasionally use capybara-themed puns or phrases (e.g., "Let's munch on some good vibes," "You're looking capy-tivating today!").

    Your tasks:
    1.  **Understand Mood**: First, understand the user's mood from their message (e.g., happy, sad, anxious, calm, energized). The mood must be one of these five options.
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
        Replace "DetectedMood" with the mood you identified (e.g., "Sad"). Do not include any other text outside this JSON object.
    6.  **Chat and Advise**: If they say no to a song, or after you've suggested one, continue the conversation by offering simple, encouraging advice relevant to their mood.
    7.  **Keep it Brief**: Keep your text responses short and conversational.
    
    **Disclaimer**: Always remember you are an AI, not a healthcare professional. Do not give medical advice. Your goal is to be a supportive friend.`;
    
    // --- Authentication ---
    auth.onAuthStateChanged(currentUser => {
        if (currentUser) {
            user = currentUser;
            addMessage('bot', "Hi there! I'm Capy, your personal companion. It's great to see you. How are you feeling today?");
        } else {
            window.location.href = 'login.html';
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // Add history icon button functionality
    const historyIconBtn = document.getElementById('history-icon-btn');
    if (historyIconBtn) {
        historyIconBtn.addEventListener('click', () => {
            window.location.href = 'history.html';
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
                logMoodToFirebase(mood);
                addMessage('bot', `I've logged that you're feeling ${currentMood}. Let me find a song for you.`);
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

    // --- API and Firebase ---
    function logMoodToFirebase(mood) {
        if (user) {
            db.collection('users').doc(user.uid).collection('moods').add({
                mood: mood,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => console.error("Error writing mood: ", error));
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function findAndPlaySong(mood) {
        const query = encodeURIComponent(mood + " vibe");
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const apiUrl = `https://api.deezer.com/search?q=${query}&limit=5`;

        try {
            const response = await fetch(proxyUrl + apiUrl);
            const data = await response.json();
            const track = data.data && data.data.length > 0 ? data.data[Math.floor(Math.random() * data.data.length)] : null;
            
            if (track && track.preview) {
                addMessage('bot', `How about this? "${track.title}" by ${track.artist.name}.`);
                const audioPlayer = document.createElement('audio');
                audioPlayer.controls = true;
                audioPlayer.src = track.preview;
                const playerContainer = document.createElement('div');
                playerContainer.classList.add('chat-message', 'bot-message');
                playerContainer.appendChild(audioPlayer);
                chatBox.appendChild(playerContainer);
                chatBox.scrollTop = chatBox.scrollHeight;
            } else {
                addMessage('bot', "I couldn't find a perfect song, but I hope things get better soon!");
            }
        } catch (error) {
            console.error("Deezer API Error:", error);
            addMessage('bot', "My music player seems to be napping. Sorry about that!");
        }
    }

    // --- Utility Functions ---
    function addMessage(sender, text, isHtml = false) {
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
            const moodClass = `bot-message-${currentMood}`;
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

    function addMessageToHistory(role, text) {
        conversationHistory.push({ role, parts: [{ text }] });
        // Optional: Limit history size to keep API calls from getting too large
        if (conversationHistory.length > 10) {
            conversationHistory.shift(); // Remove the oldest message
        }
    }
}); 