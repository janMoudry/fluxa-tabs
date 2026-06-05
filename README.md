# @moudrey/fluxa-tabs

Fluxa transport plugin for communication between browser tabs.

The plugin uses `BroadcastChannel` by default and can fall back to `localStorage` storage events. It shares the same Fluxa envelope behavior as the other transport plugins, including channel filtering, message deduplication, path tracking, and max-hop protection.

## Install

```bash
npm install @moudrey/fluxa-core @moudrey/fluxa-tabs
```

Requires `@moudrey/fluxa-core >=0.0.4`.

## Usage

```ts
import { Fluxa } from "@moudrey/fluxa-core";
import { tabsPlugin } from "@moudrey/fluxa-tabs";

type Events = {
  "call:start": { prospectId: string };
  "guidance:update": { text: string };
};

const bus = new Fluxa<Events>({
  context: { id: "app-tab" },
  plugins: [
    tabsPlugin<Events>({
      channel: "tahaak-app",
    }),
  ],
});
```

## Storage Fallback

```ts
tabsPlugin<Events>({
  channel: "tahaak-app",
  transport: "storage",
});
```

## Broadcast And Storage

```ts
tabsPlugin<Events>({
  channel: "tahaak-app",
  transport: "both",
});
```

When both transports are enabled, inbound messages are deduplicated by message id.

## Options

- `channel`: Logical message channel. Defaults to `fluxa`.
- `transport`: `broadcastChannel`, `storage`, or `both`. Defaults to `broadcastChannel` when available, otherwise `storage`.
- `direction`: `in`, `out`, or `both`. Defaults to `both`.
- `filter`: Allows or blocks events before sending or receiving.
- `maxHops`: Prevents routing loops. Defaults to `8`.
- `storageKey`: Storage key prefix. Defaults to `__fluxa_tabs__:<channel>:`.
- `BroadcastChannel`: Custom BroadcastChannel constructor for tests or adapters.
- `window`: Custom window-like object for tests or adapters.
- `serialize` / `deserialize`: Override the envelope format.

## Notes

Browser tab messaging is origin-scoped. For Chrome extension surfaces such as side panels, service workers, and content scripts, use `@moudrey/fluxa-chrome`.

## Repository

https://github.com/janMoudry/fluxa-tabs
# fluxa-tabs
