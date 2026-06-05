import type {
	FluxaEmitFn,
	FluxaEventMap,
	FluxaPlugin,
} from "@moudrey/fluxa-core";

import {
	DEFAULT_CHANNEL,
	DEFAULT_MAX_HOPS,
	PROTOCOL_VERSION,
} from "./constants";
import type {
	TabsBroadcastChannel,
	TabsBroadcastMessageListener,
	TabsEnvelope,
	TabsPluginOptions,
	TabsStorageListener,
	TabsTransport,
} from "./types";
import {
	getBroadcastChannelConstructor,
	getTabsWindow,
} from "./utils/browser";
import { defaultDeserialize, normalizeMeta } from "./utils/envelope";
import { createMessageId } from "./utils/id";
import { createSeenTracker } from "./utils/seen";
import { parseStorageValue, serializeStorageValue } from "./utils/storage";

export function tabsPlugin<Events extends FluxaEventMap = FluxaEventMap>(
	options: TabsPluginOptions<Events> = {},
): FluxaPlugin<Events> {
	const channel = options.channel ?? DEFAULT_CHANNEL;
	const direction = options.direction ?? "both";
	const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS;
	const storageKey = options.storageKey ?? `__fluxa_tabs__:${channel}:`;
	const serialize = options.serialize ?? ((envelope: TabsEnvelope) => envelope);
	const deserialize = options.deserialize ?? defaultDeserialize;
	const filter = options.filter;
	const BroadcastChannel = getBroadcastChannelConstructor(
		options.BroadcastChannel,
	);
	const tabsWindow = getTabsWindow(options.window);
	const transports = normalizeTransports(options.transport, Boolean(BroadcastChannel));

	const { hasSeen, markSeen } = createSeenTracker();
	let contextId = "";
	let emitLocal: FluxaEmitFn<Events> | null = null;
	let broadcastChannel: TabsBroadcastChannel | null = null;
	let broadcastListener: TabsBroadcastMessageListener | null = null;
	let storageListener: TabsStorageListener | null = null;

	function handlePayload(payload: unknown) {
		if (!emitLocal) return;

		const envelope = deserialize(payload);
		if (!envelope) return;
		if (envelope.channel !== channel) return;
		if (envelope.sourceContextId === contextId) return;

		if (hasSeen(envelope.messageId)) return;
		markSeen(envelope.messageId);

		const baseMeta = normalizeMeta(envelope.meta);
		const path = baseMeta.path ? [...baseMeta.path] : [];
		if (path.includes(contextId)) return;
		if (maxHops !== undefined && path.length >= maxHops) return;
		path.push(contextId);

		const nextMeta = { ...baseMeta, path };
		const eventKey = envelope.event as keyof Events;

		if (filter && !filter(eventKey, nextMeta)) return;

		emitLocal(eventKey, envelope.data as Events[keyof Events], nextMeta);
	}

	return {
		setup(ctx) {
			contextId = ctx.contextId;
			emitLocal = ctx.emitLocal;

			if (transports.includes("broadcastChannel") && BroadcastChannel) {
				broadcastChannel = new BroadcastChannel(channel);

				if (direction !== "out") {
					broadcastListener = (event) => handlePayload(event.data);
					if (broadcastChannel.addEventListener) {
						broadcastChannel.addEventListener("message", broadcastListener);
					} else {
						broadcastChannel.onmessage = broadcastListener;
					}
				}
			}

			if (direction !== "out" && transports.includes("storage")) {
				storageListener = (event) => {
					if (!event.key?.startsWith(storageKey)) return;
					if (!event.newValue) return;
					handlePayload(parseStorageValue(event.newValue));
				};
				tabsWindow?.addEventListener?.("storage", storageListener);
			}
		},
		onEmit(event, data, meta) {
			if (direction === "in") return;
			if (filter && !filter(event, meta)) return;

			const path = Array.isArray(meta.path) ? meta.path : [];
			if (maxHops !== undefined && path.length >= maxHops) return;

			const envelope: TabsEnvelope = {
				type: "fluxa",
				v: PROTOCOL_VERSION,
				channel,
				event: String(event),
				data,
				meta,
				sourceContextId: contextId,
				messageId: createMessageId(),
			};

			const payload = serialize(envelope);

			if (transports.includes("broadcastChannel")) {
				try {
					broadcastChannel?.postMessage(payload);
				} catch {
					// Ignore unavailable broadcast channels.
				}
			}

			if (transports.includes("storage")) {
				writeStoragePayload(tabsWindow?.localStorage, storageKey, envelope.messageId, payload);
			}
		},
		onDestroy() {
			if (broadcastChannel && broadcastListener) {
				if (broadcastChannel.removeEventListener) {
					broadcastChannel.removeEventListener("message", broadcastListener);
				} else {
					broadcastChannel.onmessage = null;
				}
			}
			broadcastChannel?.close();
			broadcastChannel = null;
			broadcastListener = null;

			if (storageListener) {
				tabsWindow?.removeEventListener?.("storage", storageListener);
			}
			storageListener = null;
			emitLocal = null;
		},
	};
}

function normalizeTransports(
	transport: TabsTransport | undefined,
	hasBroadcastChannel: boolean,
) {
	if (transport === "both") return ["broadcastChannel", "storage"] as const;
	if (transport) return [transport] as const;
	return hasBroadcastChannel
		? (["broadcastChannel"] as const)
		: (["storage"] as const);
}

function writeStoragePayload(
	storage: { setItem(key: string, value: string): void; removeItem(key: string): void } | undefined,
	storageKey: string,
	messageId: string,
	payload: unknown,
) {
	const value = serializeStorageValue(payload);
	if (value === null) return;

	try {
		const key = `${storageKey}${messageId}`;
		storage?.setItem(key, value);
		storage?.removeItem(key);
	} catch {
		// Ignore storage quota, security, or availability errors.
	}
}
