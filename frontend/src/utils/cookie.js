export function getCSRFToken() {
	
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === 'csrftoken') {
					return decodeURIComponent(value);
			}
	}
	return null;
}

export function deleteCSRFToken() {
	const csrfToken = getCSRFToken();
	
	if (csrfToken !== null) {
		document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}
}