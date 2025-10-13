// src/services/rateLimiter.js

export default class RateLimiter {
	constructor(concurrency = 1) {
		this.concurrency = Math.max(1, concurrency);
		this.queue = [];
		this.active = 0;
	}
	run(fn) {
		return new Promise((resolve, reject) => {
			const task = async () => {
				this.active++;
				try {
					const res = await fn();
					resolve(res);
				} catch (e) {
					reject(e);
				} finally {
					this.active--;
					this._next();
				}
			};
			this.queue.push(task);
			this._next();
		});
	}
	_next() {
		if (this.active >= this.concurrency) return;
		const task = this.queue.shift();
		if (task) task();
	}
}
