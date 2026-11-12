# Chrome Web Store listing

Copy each field into the Developer Dashboard.

## Store listing tab

**Name:** Show Keys

**Summary** (132 characters max):
Shows the keys you press at the bottom of the page. Use it for screen recordings, demos, and tutorials.

**Category:** Tools

**Language:** English

**Description:**

Show Keys shows each key you press as a key cap at the bottom center of the page. Use it when you record your screen, give a demo, or teach keyboard shortcuts.

- Click the toolbar icon to turn the overlay on or off.
- Select one of three key styles: Flat, Skeuomorphic, or Neon.
- Shortcuts show as one group, for example ⌘ ⇧ P.
- The keys go away 1.5 seconds after your last key press.
- Keys typed in password fields do not show.

Privacy: Show Keys sends no data. It makes no network requests and has no analytics. It does not record the keys you press.

**Icon:** icons/icon-128.png

**Screenshots:** Upload the four files in `store/screenshots/`, in this order:
1. `1-flat-doc.png`
2. `2-skeuomorphic-code.png`
3. `3-neon-slides.png`
4. `4-popup.png`

To capture them again, run this command from the project folder:
`node store/shoot.mjs . "<path to Chrome for Testing>" store/screenshots`

**Small promo tile (440 × 280):** `store/screenshots/promo-small-440x280.png`

**Marquee promo tile (1400 × 560):** `store/screenshots/promo-marquee-1400x560.png`

## Privacy tab

**Single purpose:**
Show the keys the user presses as an overlay on the current web page.

**Permission justification — storage:**
Saves two settings: whether the overlay is on, and the key style the user selected.

**Permission justification — host permission (content script on all URLs):**
The overlay must work on each page the user records or presents. The script reads key presses only to draw them on the screen. It sends no data.

**Remote code:** No, I do not use remote code.

**Data use:** Select no data types. The extension reads key presses only on the device to draw them, and it does not collect or send them.

**Certifications:** Select all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/mailtokamalnayan/show-keys/blob/main/PRIVACY.md

## Distribution tab

**Visibility:** Public, or Unlisted if you want to share it only by link.

**Regions:** All regions.
