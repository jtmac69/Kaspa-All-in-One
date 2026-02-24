# Tray App Assets

Place the following icon files here before building:

| File | Size | Purpose |
|------|------|---------|
| `tray-green.png` | 22×22 | Both wizard + dashboard healthy |
| `tray-yellow.png` | 22×22 | One service healthy, one not |
| `tray-red.png` | 22×22 | Neither service healthy |
| `tray-grey.png` | 22×22 | Initial/unknown state |
| `tray-greenTemplate.png` | 16×16 @2x | macOS dark-mode adaptive (white/black) |
| `tray-yellowTemplate.png` | 16×16 @2x | macOS adaptive |
| `tray-redTemplate.png` | 16×16 @2x | macOS adaptive |
| `tray-greyTemplate.png` | 16×16 @2x | macOS adaptive |
| `icon.png` | 256×256 | App icon (notifications, About box) |
| `icon.icns` | — | macOS app bundle icon |
| `icon.ico` | — | Windows installer + tray icon |

macOS template images must be named `*Template.png` so the OS applies
light/dark adaptive rendering automatically.
