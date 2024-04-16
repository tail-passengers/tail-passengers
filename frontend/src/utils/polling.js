export const pollingFetches = (func, interval, maxAttempts = -1) => {
	let attempts = 0;
	let intervalId = setInterval(() => {
			if (maxAttempts === attempts) {
					clearInterval(intervalId);
					return;
			}
			attempts++;
			func();
	}, interval);
	return intervalId;
};
