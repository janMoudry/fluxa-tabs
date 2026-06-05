import type { FluxaEventMap, FluxaEventMeta } from "@moudrey/fluxa-core";

export type TabsDirection = "in" | "out" | "both";

export type TabsTransport = "broadcastChannel" | "storage" | "both";

export type TabsBroadcastMessageEvent = {
	data: unknown;
};

export type TabsBroadcastMessageListener = (
	event: TabsBroadcastMessageEvent,
) => void;

export type TabsBroadcastChannel = {
	postMessage(message: unknown): void;
	close(): void;
	addEventListener?: (
		type: "message",
		listener: TabsBroadcastMessageListener,
	) => void;
	removeEventListener?: (
		type: "message",
		listener: TabsBroadcastMessageListener,
	) => void;
	onmessage?: TabsBroadcastMessageListener | null;
};

export type TabsBroadcastChannelConstructor = new (
	name: string,
) => TabsBroadcastChannel;

export type TabsStorage = {
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
};

export type TabsStorageEvent = {
	key: string | null;
	newValue: string | null;
};

export type TabsStorageListener = (event: TabsStorageEvent) => void;

export type TabsWindow = {
	localStorage?: TabsStorage;
	addEventListener?: (type: "storage", listener: TabsStorageListener) => void;
	removeEventListener?: (
		type: "storage",
		listener: TabsStorageListener,
	) => void;
};

export type TabsEnvelope = {
	type: "fluxa";
	v: 1;
	channel: string;
	event: string;
	data: unknown;
	meta: FluxaEventMeta;
	sourceContextId: string;
	messageId: string;
};

export type TabsPluginOptions<Events extends FluxaEventMap = FluxaEventMap> = {
	channel?: string;
	transport?: TabsTransport;
	direction?: TabsDirection;
	filter?: <K extends keyof Events>(event: K, meta: FluxaEventMeta) => boolean;
	maxHops?: number;
	storageKey?: string;
	BroadcastChannel?: TabsBroadcastChannelConstructor;
	window?: TabsWindow;
	serialize?: (envelope: TabsEnvelope) => unknown;
	deserialize?: (data: unknown) => TabsEnvelope | null;
};
