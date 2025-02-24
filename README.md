# Obsidian/Ebenezer  🪨
### A Rock of Help
[![Obsidian/Ebenezer Full Demo](https://img.youtube.com/vi/t_AqacQm85w/0.jpg)](https://www.youtube.com/watch?v=t_AqacQm85w "Obsidian/Ebenezer Full Demo")

Ebenezer is a Scripture study tool for searching and referencing Biblical passages in Obsidian. 

## Settings ⚙️
### Required Settings
- **Settings > Community Plugins > Installed Plugins**
	-  Enable **Ebenezer Plugin** for verse hotkeys

### Optional Settings
- **Settings > Appearance > CSS snippets**
	- Enable/disable  **ebenezer-lexicon-wikilink-hiding** to hide/show wiki-link formatting on lexicon words
	- Enable/disable **ebenezer-embedded-link-icon-hiding** to hide/show the link button on embedded text
- **Settings > Hotkeys > Search "Ebenezer"**
	- Verse hotkeys can be modified as desired
- **Settings > Ebenezer Plugin"**
	- Toggle between using Arabic vs. Roman Numerals for default citation
	- If `_Scripture` directory name is modified or relocated, rename the  Scripture Directory to match the new name/location. 
	- Set the default translation source for wiki-link generation from the list of available translations (folders within the Scripture Directory). Defaults to **ESV.**
- **Within the Vault**
	- New translations can be added within the `_Scripture` directory. 

## Verse Hotkeys 🔥
- `Ctrl/Cmd + R` : Add Wiki-Links to Citation, or Add Citation to Wiki-Links (contextual) 
- `Ctrl/Cmd + Shift + R`: Cycle Translation
- `Ctrl/Cmd + Shift + Alt + R`: Cycle Translation (reverse direction)

In other words: 
1. "I John 1:9" ➕ `Ctrl/Cmd + R` ➜ `![[_Scripture/ESV/62_I_John#^0109]]` added above
2. `![[_Scripture/ESV/62_I_John#^0109]]` ➕  `Ctrl/Cmd + R` ➜  "I John 1:9" added below

## Bible Format Guide 📚
### File Names
```
<Number>_<Roman-Numeral-if-Applicable>_<Book-Name>.md
```

### File Contents
Chapter and verse numbers are identified by their anchor numbers. 

**Standard Book Format (Non-Psalms):**
```
Verse text ^CCVV
```
**Psalms:**
```
Verse text ^CCCVVV
```

## Searching a Translation  🔎

Recommend searching one translation at a time by beginning your search with:
```
path:_Scripture/ESV
```

Similarly, it is recommended that personal notes be kept in a separate folder so that the same process can be applied to searching your own files.

## Bible Sources ✝️
- ESV:
	- Non-Psalms: [Bible](https://github.com/rwev/bible/tree/master)
	- Psalms: [mdbible – ESV Bible in Markdown](https://github.com/lguenth/mdbible) (includes choirmaster instructions and Psalm 119 letters)
- BSB: [Berean Study Bible with Strongs](https://github.com/gapmiss/berean-study-bible-with-strongs).
- HEB+BYZ:
	- HEB: Hebrew Old Testament from [Bible](https://github.com/ivandustin/bible)
	- BYZ: [The New Testament in the original Greek: Byzantine textform](https://github.com/byztxt/byzantine-majority-text)

## Wiki-Link Usage Manual  🔗

#### Links 
Wiki-links have the following structure:
```
[[Filename]]
```
For example: 
```
[[62_I_John]]
```
[[_Scripture/HEB-BYZ/62_I_John]]

Our vault contains multiple translations of I John, so we want to specify the ESV file:
```
[[_Scripture/ESV/62_I_John]]
```
[[_Scripture/ESV/62_I_John]]

#### Display Text
To make the link a little prettier, we can change the display text by adding a pipe (`|`):
```
[[_Scripture/ESV/62_I_John|I John]]
```
[[_Scripture/ESV/62_I_John|I John]]

#### Anchors (Chapter/Verse)
To cite I John 1:9, we add an anchor reference (`#^`):
```
[[_Scripture/ESV/62_I_John#^0109]]
```
[[_Scripture/ESV/62_I_John#^0109]]

To change the display text:
```
[[_Scripture/ESV/62_I_John#^0109|I John 1:9]]
```
[[_Scripture/ESV/62_I_John#^0109|I John 1:9]]

To embed a verse, add an exclamation mark:
```
![[_Scripture/ESV/62_I_John#^0109]]
```
![[_Scripture/ESV/62_I_John#^0109]]

This is the text that is automatically generated using the "Toggle Citation/WikiLinks" hotkey (`Ctrl/Cmd + R`).

## Upcoming Fixes 🐞
- ESV text has no double quotation marks -> will be remedied
- ESV Psalms, Proverbs chapter numbers -> will be added
- BSB Psalm 119 should have letter headings -> will be added
- HEB Psalms + Proverbs chapter numbers, Psalm 119 headings -> will be added