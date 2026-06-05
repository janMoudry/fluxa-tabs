export function parseStorageValue(value: string) {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}

export function serializeStorageValue(value: unknown) {
	try {
		return JSON.stringify(value);
	} catch {
		return null;
	}
}
