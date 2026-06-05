export function createMessageId() {
	return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}
