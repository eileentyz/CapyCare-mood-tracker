// Option 1: Direct API key (replace with your actual key)
window.geminiApiKey = "AIzaSyBd_-Bib8OLENDvdrF8S7dploUK719zv4Q";

// Option 2: Check localStorage first, then prompt user if not found
// Uncomment the lines below if you want users to enter their own API key
/*
if (!localStorage.getItem('geminiApiKey')) {
    const apiKey = prompt("Please enter your Gemini API key to use CapyCare:");
    if (apiKey) {
        localStorage.setItem('geminiApiKey', apiKey);
    }
}
window.geminiApiKey = localStorage.getItem('geminiApiKey') || "AIzaSyDBe7Yl5O8qrGsf1NZXMVBcchb10zqbkC4";
*/