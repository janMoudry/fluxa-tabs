import type {
	TabsBroadcastChannelConstructor,
	TabsWindow,
} from "../types";

type GlobalTabs = {
	BroadcastChannel?: TabsBroadcastChannelConstructor;
	window?: TabsWindow;
};

export function getBroadcastChannelConstructor(
	constructorOverride?: TabsBroadcastChannelConstructor,
) {
	return (
		constructorOverride ??
		(globalThis as GlobalTabs).BroadcastChannel
	);
}

export function getTabsWindow(windowOverride?: TabsWindow) {
	return windowOverride ?? (globalThis as GlobalTabs).window;
}
