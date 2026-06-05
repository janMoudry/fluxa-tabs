import { Fluxa } from "@moudrey/fluxa-core";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { tabsPlugin } from "../src";
import type {
	TabsBroadcastChannel,
	TabsBroadcastMessageEvent,
	TabsBroadcastMessageListener,
	TabsStorageEvent,
	TabsStorageListener,
	TabsWindow,
} from "../src/core/types";

type Events = {
	"test:event": { value: number };
};

class FakeBroadcastChannel implements TabsBroadcastChannel {
	private static channels = new Map<string, Set<FakeBroadcastChannel>>();

	private listeners = new Set<TabsBroadcastMessageListener>();

	static reset() {
		FakeBroadcastChannel.channels.clear();
	}

	constructor(private readonly name: string) {
		const channels = FakeBroadcastChannel.channels.get(name) ?? new Set();
		channels.add(this);
		FakeBroadcastChannel.channels.set(name, channels);
	}

	postMessage(message: unknown) {
		const channels = FakeBroadcastChannel.channels.get(this.name) ?? new Set();
		for (const channel of channels) {
			if (channel !== this) channel.dispatch(message);
		}
	}

	addEventListener(_type: "message", listener: TabsBroadcastMessageListener) {
		this.listeners.add(listener);
	}

	removeEventListener(_type: "message", listener: TabsBroadcastMessageListener) {
		this.listeners.delete(listener);
	}

	close() {
		FakeBroadcastChannel.channels.get(this.name)?.delete(this);
	}

	private dispatch(message: unknown) {
		const event: TabsBroadcastMessageEvent = { data: message };
		for (const listener of this.listeners) listener(event);
	}
}

function createStoragePair() {
	const listeners = new Map<TabsWindow, Set<TabsStorageListener>>();

	function createWindow(): TabsWindow {
		const win: TabsWindow = {
			localStorage: {
				setItem(key, value) {
					for (const [targetWindow, targetListeners] of listeners) {
						if (targetWindow === win) continue;
						const event: TabsStorageEvent = { key, newValue: value };
						for (const listener of targetListeners) listener(event);
					}
				},
				removeItem(key) {
					for (const [targetWindow, targetListeners] of listeners) {
						if (targetWindow === win) continue;
						const event: TabsStorageEvent = { key, newValue: null };
						for (const listener of targetListeners) listener(event);
					}
				},
			},
			addEventListener(_type, listener) {
				const windowListeners = listeners.get(win) ?? new Set();
				windowListeners.add(listener);
				listeners.set(win, windowListeners);
			},
			removeEventListener(_type, listener) {
				listeners.get(win)?.delete(listener);
			},
		};

		return win;
	}

	return { a: createWindow(), b: createWindow() };
}

const baseMeta = {
	id: "meta-1",
	timestamp: 1,
};

describe("tabsPlugin", () => {
	beforeEach(() => {
		FakeBroadcastChannel.reset();
	});

	it("sends events between tabs through BroadcastChannel", () => {
		const busA = new Fluxa<Events>({
			context: { id: "tab-a" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					BroadcastChannel: FakeBroadcastChannel,
				}),
			],
		});
		const busB = new Fluxa<Events>({
			context: { id: "tab-b" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					BroadcastChannel: FakeBroadcastChannel,
				}),
			],
		});
		const received = vi.fn();
		busB.on("test:event", received);

		busA.emit("test:event", { value: 1 }, baseMeta);

		expect(received).toHaveBeenCalledTimes(1);
		expect(received).toHaveBeenCalledWith(
			{ value: 1 },
			expect.objectContaining({ path: ["tab-a", "tab-b"] }),
		);

		busA.destroy();
		busB.destroy();
	});

	it("supports localStorage storage event transport", () => {
		const windows = createStoragePair();
		const busA = new Fluxa<Events>({
			context: { id: "tab-a" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					transport: "storage",
					window: windows.a,
				}),
			],
		});
		const busB = new Fluxa<Events>({
			context: { id: "tab-b" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					transport: "storage",
					window: windows.b,
				}),
			],
		});
		const received = vi.fn();
		busB.on("test:event", received);

		busA.emit("test:event", { value: 2 }, baseMeta);

		expect(received).toHaveBeenCalledTimes(1);
		expect(received).toHaveBeenCalledWith(
			{ value: 2 },
			expect.objectContaining({ path: ["tab-a", "tab-b"] }),
		);
	});

	it("deduplicates when both transports deliver the same message", () => {
		const windows = createStoragePair();
		const busA = new Fluxa<Events>({
			context: { id: "tab-a" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					transport: "both",
					BroadcastChannel: FakeBroadcastChannel,
					window: windows.a,
				}),
			],
		});
		const busB = new Fluxa<Events>({
			context: { id: "tab-b" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					transport: "both",
					BroadcastChannel: FakeBroadcastChannel,
					window: windows.b,
				}),
			],
		});
		const received = vi.fn();
		busB.on("test:event", received);

		busA.emit("test:event", { value: 3 }, baseMeta);

		expect(received).toHaveBeenCalledTimes(1);
	});

	it("respects filters and maxHops", () => {
		const filter = vi.fn(() => false);
		const busA = new Fluxa<Events>({
			context: { id: "tab-a" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					BroadcastChannel: FakeBroadcastChannel,
					filter,
					maxHops: 1,
				}),
			],
		});
		const busB = new Fluxa<Events>({
			context: { id: "tab-b" },
			plugins: [
				tabsPlugin<Events>({
					channel: "chan",
					BroadcastChannel: FakeBroadcastChannel,
					maxHops: 1,
				}),
			],
		});
		const received = vi.fn();
		busB.on("test:event", received);

		busA.emit("test:event", { value: 4 }, baseMeta);
		busA.emit("test:event", { value: 5 }, { ...baseMeta, path: ["a"] });

		expect(received).toHaveBeenCalledTimes(0);
	expect(filter).toHaveBeenCalledTimes(2);
	});
});
