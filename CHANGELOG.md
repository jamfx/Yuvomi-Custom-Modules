# Changelog

All notable changes to the modules in this repository. Versions are per module.

## countdown

### 1.3.2

- The dashboard widget now shows the name "Countdowns" with an hourglass icon in the widget picker instead of its internal id "next".

### 1.3.1

- Emoji for shared countdowns via `#countdown:🏖️`. The marker, including a trailing colon, is removed from the displayed title.

### 1.3.0

- Revised layout of the page and the dashboard widget: number tile, cards, spacing, responsive on small screens.
- The widget loads its own stylesheet, because Yuvomi loads a module's CSS only on the module page.
- The calendar's icon name is no longer shown as text.
- The calendar request is retried once and bypasses the browser cache. An error now shows the HTTP status.

### 1.0.0

- First version. Shared countdowns from calendar events marked `#countdown`, personal countdowns in the browser, dashboard widget.
