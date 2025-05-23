# Obsidian/Ebenezer  🪨
### A Rock of Help
[![Obsidian/Ebenezer Full Demo](https://img.youtube.com/vi/t_AqacQm85w/0.jpg)](https://www.youtube.com/watch?v=t_AqacQm85w "Obsidian/Ebenezer Full Demo")

Ebenezer is a Scripture study resource/tool for Obsidian. 

It is both:
- a **plugin** for navigating Bible translations formatted in the Ebenezer paradigm, and 
- an **Obsidian Vault** containing a few pre-formatted Bible translations.

>[!info] 
>This repo is meant to be cloned or downloaded directly from GitHub and opened as an Obsidian Vault. Allow Community Plugins and enable the Ebenezer Plugin as necessary.

---

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

---

## Verse Hotkeys 🔥
- `Ctrl/Cmd + R` : Add Wiki-Links to Citation, or Add Citation to Wiki-Links (contextual) 
- `Ctrl/Cmd + Shift + R`: Cycle Translation
- `Ctrl/Cmd + Shift + Alt + R`: Cycle Translation (reverse direction)

In other words: 
1. "I John 1:9" ➕ `Ctrl/Cmd + R` ➜ `![[_Scripture/ESV/62_I_John#^0109]]` added above
2. `![[_Scripture/ESV/62_I_John#^0109]]` ➕  `Ctrl/Cmd + R` ➜  "I John 1:9" added below

---

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

---

## Searching a Translation  🔎

Recommend searching one translation at a time by beginning your search with:
```
path:ESV
```

Similarly, it is recommended that personal notes be kept in a separate folder so that the same process can be applied to searching your own files.

---

## Bible Sources ✝️
- ESV:
	- Non-Psalms: [Bible](https://github.com/rwev/bible/tree/master)
	- Psalms: [mdbible – ESV Bible in Markdown](https://github.com/lguenth/mdbible) (includes choirmaster instructions and Psalm 119 letters)
- BSB: [Berean Study Bible with Strongs](https://github.com/gapmiss/berean-study-bible-with-strongs).
- HEB+BYZ:
	- HEB: Hebrew Old Testament from [Bible](https://github.com/ivandustin/bible)
	- BYZ: [The New Testament in the original Greek: Byzantine textform](https://github.com/byztxt/byzantine-majority-text)

---

## Wiki-Link Manual  🔗
### Quickstart
Once opened as an Obsidian Vault, with the Ebenezer Plugin enabled, type:
```
1 John 1:8-2:1
```

Then, with your text cursor on the line containing the reference, hit the hotkey `Ctrl/Cmd + R`.

The source text transforms into:
```
![[ESV/62_I_John#^0108]] ![[ESV/62_I_John#^0109]] ![[ESV/62_I_John#^0110]] ![[ESV/62_I_John#^0201]]
1 John 1:8-2:1
```
which, in Obisidian's reader view, will show the full text and reference. The same works in reverse: if you remove the reference, leaving only the wiki-link:
```
![[ESV/62_I_John#^0108]] ![[ESV/62_I_John#^0109]] ![[ESV/62_I_John#^0110]] ![[ESV/62_I_John#^0201]]
```
And hit `Ctrl/Cmd + R`, you will once again be left with:
```
![[ESV/62_I_John#^0108]] ![[ESV/62_I_John#^0109]] ![[ESV/62_I_John#^0110]] ![[ESV/62_I_John#^0201]]
1 John 1:8-2:1
```

References will be formatted by the standard convention, but wiki-link generation accommodates common-sense variants. In other words,
Jude 20-22 = Jude 1:20-22 = Jude 1:20-1:22

### Advanced Formatting
This is particularly applicable to those new to Obsidian. If you already are familiar with Obsidian, skip to [[#Advanced Formatting#Anchors (Chapter/Verse)]].

#### Links 
Wiki-links have the following structure:
```
[[Filename]]
```
For example: 
```
[[62_I_John]]
```

Our vault contains multiple translations of I John, so we want to specify the ESV file:
```
[[ESV/62_I_John]]
```

It is recommended that all translations be kept in a single directory, such as `_Scripture` directory within this vault. If you choose to move or rename the directory, you must specify the new folder name in the Ebenezer Plugin settings to allow for Translation Cycling hotkeys.

#### Display Text
To make the link a little prettier, we can change the display text by adding a pipe (`|`):
```
[[ESV/62_I_John|I John]]
```
[[ESV/62_I_John|I John]]

#### Anchors (Chapter/Verse)
To cite I John 1:9, we add an anchor reference (`#^`):
```
[[ESV/62_I_John#^0109]]
```
[[ESV/62_I_John#^0109]]

To embed a verse, add an exclamation mark:
```
![[ESV/62_I_John#^0109]]
```
![[ESV/62_I_John#^0109]]

This is the text that is automatically generated using the "Toggle Citation/WikiLinks" hotkey (`Ctrl/Cmd + R`).

---

## Upcoming Fixes 🐞
- ESV text has no double quotation marks -> will be remedied
- ESV Psalms, Proverbs chapter numbers -> will be added
- BSB Psalm 119 should have letter headings -> will be added
- HEB Psalms + Proverbs chapter numbers, Psalm 119 headings -> will be added