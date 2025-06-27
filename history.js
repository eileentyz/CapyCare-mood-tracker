document.addEventListener('DOMContentLoaded', () => {
    let user;
    let moodData = [];
    let moodChart;

    // Check authentication
    auth.onAuthStateChanged(currentUser => {
        if (currentUser) {
            user = currentUser;
            loadMoodHistory();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'mood.html';
    });

    async function loadMoodHistory() {
        try {
            // Fetch mood data from Firebase
            const moodsRef = db.collection('users').doc(user.uid).collection('moods');
            const snapshot = await moodsRef.orderBy('timestamp', 'desc').get();
            
            moodData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                moodData.push({
                    id: doc.id,
                    mood: data.mood,
                    timestamp: data.timestamp.toDate()
                });
            });

            if (moodData.length === 0) {
                showEmptyState();
                return;
            }

            // Create chart
            createMoodChart();
            
            // Update statistics
            updateStatistics();
            
            // Show recent moods
            showRecentMoods();

        } catch (error) {
            console.error('Error loading mood history:', error);
            document.querySelector('.history-content').innerHTML = 
                '<p style="text-align: center; color: #666;">Error loading mood history. Please try again.</p>';
        }
    }

    function createMoodChart() {
        const ctx = document.getElementById('moodChart').getContext('2d');
        
        // Group moods by date (last 30 days)
        const last30Days = getLast30Days();
        const moodCounts = {};
        
        // Initialize counts
        last30Days.forEach(date => {
            moodCounts[date] = { happy: 0, sad: 0, anxious: 0, calm: 0, energized: 0 };
        });

        // Count moods for each date
        moodData.forEach(entry => {
            const date = entry.timestamp.toISOString().split('T')[0];
            if (moodCounts[date]) {
                const mood = entry.mood.toLowerCase();
                if (moodCounts[date][mood] !== undefined) {
                    moodCounts[date][mood]++;
                }
            }
        });

        // Prepare chart data
        const labels = last30Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const datasets = [
            { label: 'Happy', data: last30Days.map(date => moodCounts[date].happy), borderColor: '#fceec5', backgroundColor: '#fceec5', tension: 0.4 },
            { label: 'Sad', data: last30Days.map(date => moodCounts[date].sad), borderColor: '#d4e4f7', backgroundColor: '#d4e4f7', tension: 0.4 },
            { label: 'Anxious', data: last30Days.map(date => moodCounts[date].anxious), borderColor: '#f5e1f7', backgroundColor: '#f5e1f7', tension: 0.4 },
            { label: 'Calm', data: last30Days.map(date => moodCounts[date].calm), borderColor: '#d5f7d4', backgroundColor: '#d5f7d4', tension: 0.4 },
            { label: 'Energized', data: last30Days.map(date => moodCounts[date].energized), borderColor: '#ffddc1', backgroundColor: '#ffddc1', tension: 0.4 }
        ];

        moodChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Mood Trends (Last 30 Days)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function getLast30Days() {
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }

    function updateStatistics() {
        // Most common mood
        const moodCounts = {};
        moodData.forEach(entry => {
            const mood = entry.mood.toLowerCase();
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        
        const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
            moodCounts[a] > moodCounts[b] ? a : b
        );
        
        document.getElementById('most-common-mood').textContent = 
            mostCommonMood.charAt(0).toUpperCase() + mostCommonMood.slice(1);

        // Total entries
        document.getElementById('total-entries').textContent = moodData.length;

        // This week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekCount = moodData.filter(entry => 
            entry.timestamp > oneWeekAgo
        ).length;
        
        document.getElementById('this-week').textContent = thisWeekCount;
    }

    function showRecentMoods() {
        const recentMoodsList = document.getElementById('recent-moods-list');
        const recentMoods = moodData.slice(0, 10); // Show last 10 moods
        
        recentMoodsList.innerHTML = recentMoods.map(entry => {
            const date = entry.timestamp.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const moodEmoji = getMoodEmoji(entry.mood);
            
            return `
                <div class="mood-entry">
                    <span class="mood-emoji">${moodEmoji}</span>
                    <span class="mood-text">${entry.mood}</span>
                    <span class="mood-date">${date}</span>
                </div>
            `;
        }).join('');
    }

    function getMoodEmoji(mood) {
        const emojis = {
            'happy': '😊',
            'sad': '😢',
            'anxious': '😰',
            'calm': '😌',
            'energized': '⚡'
        };
        return emojis[mood.toLowerCase()] || '😊';
    }

    function showEmptyState() {
        document.querySelector('.history-content').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>No Mood Data Yet</h2>
                <p style="color: #666; margin-bottom: 2rem;">
                    Start chatting with Capy to track your moods and see your journey here!
                </p>
                <button onclick="window.location.href='mood.html'" class="btn">
                    Start Chatting
                </button>
            </div>
        `;
    }
}); 