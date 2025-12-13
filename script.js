// emailjs, google recapcha, ratelimiting // see message3.html in web_projects for details
// Initialize EmailJS with your public key
// emailjs.init('YOUR_PUBLIC_KEY'); // Replace with your EmailJS public key // -----

emailjs.init({
	publicKey: 'BMpqn55kC4StsskVn', // -----
	limitRate: {
		id: 'contact-form',           // Identifier for rate limit scope
		throttle: 60000,     // 1 min between requests 
	}
});
// Rate limiting configuration
const RATE_LIMIT_MINUTES = 5;
const STORAGE_KEY = 'lastMessageTimeSP';
// Check if rate limit is active
function checkRateLimit() {
	const lastMessageTime = localStorage.getItem(STORAGE_KEY);
	if (!lastMessageTime) return { allowed: true };
	const timePassed = Date.now() - parseInt(lastMessageTime);
	const minutesPassed = Math.floor(timePassed / 60000);
	const minutesRemaining = RATE_LIMIT_MINUTES - minutesPassed;
	if (minutesPassed < RATE_LIMIT_MINUTES) {
		return {
			allowed: false,
			minutesRemaining: minutesRemaining,
			secondsRemaining: Math.ceil((timePassed % 60000) / 1000)
		};
	}
	return { allowed: true };
}
// Save current time after successful send
function setRateLimit() {
	localStorage.setItem(STORAGE_KEY, Date.now().toString());
}
// Get user's IP and browser info
async function getUserInfo() {
	let userIP = 'Unknown';
	try {
		const response = await fetch('https://api.ipify.org?format=json');
		const data = await response.json();
		userIP = data.ip;
	} catch (error) {
		console.log('Could not fetch IP');
	}
	// Get GMT timestamp
	const now = new Date();
	const gmtTimestamp = now.toUTCString();
	return {
		ip: userIP,
		browser: navigator.userAgent,
		language: navigator.language,
		platform: navigator.platform,
		timestamp: gmtTimestamp
	};
}
// Handle form submission
document.getElementById('contactForm').addEventListener('submit', async function(e) {
	e.preventDefault();			
	// Check rate limit first
	const rateLimitCheck = checkRateLimit();
	if (!rateLimitCheck.allowed) {
		const waitTime = rateLimitCheck.minutesRemaining === 0 
			? `${60 - rateLimitCheck.secondsRemaining} seconds`
			: `${rateLimitCheck.minutesRemaining} minute(s)`;
		alert(`⏱ Please wait ${waitTime} before sending another message.\n\nRate limit: 1 message per ${RATE_LIMIT_MINUTES} minutes.`);
		return;
	}
	// Get reCAPTCHA response
	const recaptchaResponse = grecaptcha.getResponse();			
	// Check if reCAPTCHA is completed
	if (!recaptchaResponse) {
		alert('⚠️ Please complete the reCAPTCHA verification.');
		return;
	}
	const submitBtn = document.getElementById('submitBtn');
	submitBtn.disabled = true;
	submitBtn.textContent = 'Sending...';
	// Get form data
	const name = document.getElementById('name').value;
	const email = document.getElementById('email').value;
	const message = document.getElementById('message').value;
	// Get user info
	const userInfo = await getUserInfo();
	// Prepare template parameters (MUST include g-recaptcha-response)
	const templateParams = {
		from_name: name,
		from_email: email,
		message: message,
		user_ip: userInfo.ip,
		user_browser: userInfo.browser,
		user_language: userInfo.language,
		user_platform: userInfo.platform,
		timestamp: userInfo.timestamp,
		'g-recaptcha-response': recaptchaResponse  // Required for EmailJS reCAPTCHA
	};
	// Send email using EmailJS
	emailjs.send('service_md9qmkz', 'template_5tqajwt', templateParams) // -----
		.then(function(response) {
			setRateLimit(); // Set rate limit after successful send
			alert('✓ Message sent successfully!\n\nThank you for contacting us. We will get back to you soon.');
			document.getElementById('contactForm').reset();
			grecaptcha.reset(); // Reset reCAPTCHA after successful submission
		})
		.catch(function(error) {
			alert('✗ Failed to send message.\n\nError: ' + error.text + '\n\nPlease check your reCAPTCHA setup and try again.');
			console.error('EmailJS Error:', error);
			grecaptcha.reset(); // Reset reCAPTCHA on error
		})
		.finally(function() {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Send Message';
		});
});