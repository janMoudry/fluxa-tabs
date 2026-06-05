import type { FluxaEventMeta } from "@moudrey/fluxa-core";

import { PROTOCOL_VERSION } from "../constants";
import type { TabsEnvelope } from "../types";

import { createMessageId } from "./id";
import { isPlainObject } from "./object";

export function normalizeMeta(meta: unknown): FluxaEventMeta {
	const base = isPlainObject(meta) ? meta : {};
	return {
		...base,
		id: typeof base.id === "string" ? base.id : createMessageId(),
		timestamp: typeof base.timestamp === "number" ? base.timestamp : Date.now(),
		path: Array.isArray(base.path) ? (base.path as string[]) : [],
	};
}

export function defaultDeserialize(data: unknown): TabsEnvelope | null {
	if (!isPlainObject(data)) return null;
	if (data.type !== "fluxa") return null;
	if (data.v !== PROTOCOL_VERSION) return null;
	if (typeof data.channel !== "string") return null;
	if (typeof data.event !== "string") return null;
	if (!("meta" in data)) return null;
	if (typeof data.sourceContextId !== "string") return null;
	if (typeof data.messageId !== "string") return null;
	return data as TabsEnvelope;
}
