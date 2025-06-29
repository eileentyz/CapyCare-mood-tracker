document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    if (signupBtn) {
        // Handle Sign Up
        signupBtn.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                errorMessage.textContent = 'Please enter email and password.';
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in 
                    console.log('Signed up:', userCredential.user);
                    
                    // Store user info in localStorage
                    const userInfo = {
                        email: userCredential.user.email,
                        uid: userCredential.user.uid
                    };
                    localStorage.setItem('capycare_user', JSON.stringify(userInfo));
                    localStorage.setItem('capycare_last_login', Date.now().toString());
                    window.location.href = 'mood.html';
                })
                .catch((error) => {
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage.textContent = 'This email is already registered. Please log in.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage.textContent = 'Password should be at least 6 characters.';
                    } else {
                        console.error('Signup Error:', error);
                        errorMessage.textContent = 'An error occurred during sign up. Please try again.';
                    }
                });
        });
    }

    if (loginBtn) {
        // Handle Login
        loginBtn.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                errorMessage.textContent = 'Please enter email and password.';
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in
                    console.log('Logged in:', userCredential.user);
                    
                    // Store user info in localStorage
                    const userInfo = {
                        email: userCredential.user.email,
                        uid: userCredential.user.uid
                    };
                    localStorage.setItem('capycare_user', JSON.stringify(userInfo));
                    localStorage.setItem('capycare_last_login', Date.now().toString());
                    window.location.href = 'mood.html';
                })
                .catch((error) => {
                    // This generic error is returned for security reasons (to prevent email enumeration).
                    if (error.code === 'auth/invalid-credential' ||
                        error.code === 'auth/invalid-login-credentials' ||
                        (error.message && error.message.includes('INVALID_LOGIN_CREDENTIALS'))) {
                        errorMessage.textContent = 'Invalid email or password. Please check your credentials or sign up.';
                    } else {
                        console.error('Login Error:', error);
                        errorMessage.textContent = 'An error occurred during login. Please try again.';
                    }
                });
        });
    }
}); 