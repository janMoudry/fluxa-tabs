export function createSeenTracker(limit = 500) {
	const seen = new Set<string>();
	const order: string[] = [];

	return {
		hasSeen(id: string) {
			return seen.has(id);
		},
		markSeen(id: string) {
			if (seen.has(id)) return;
			seen.add(id);
			order.push(id);

			while (order.length > limit) {
				const next = order.shift();
				if (next) seen.delete(next);
			}
		},
	};
}
