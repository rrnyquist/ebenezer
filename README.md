# Obsidian/Ebenezer
### A Rock of Help

Ebenezer is a Scripture study tool for searching and referencing Biblical passages in Obsidian. 

## Settings: ⚙️
### Required Settings:
- **Settings > Community Plugins > Installed Plugins**
	-  Enable **Ebenezer Plugin** for verse hotkeys

### Optional Settings:
- **Settings > Appearance > CSS snippets**
	- Enable/disable  **ebenezer-lexicon-wikilink-hiding** to hide/show wikilink formatting on lexicon words
- **Settings > Hotkeys > Search "Ebenezer"**
	- Verse hotkeys can be modified as desired
- **Settings > Ebenezer Plugin"**
	- Toggle between using Arabic vs. Roman Numerals for default citation
	- If `_Scripture` directory name is modified or relocated, rename the  Scripture Directory to match the new name/location. 
	- Set the default translation source for wikilink generation from the list of available translations (folders within the Scripture Directory). Defaults to **ESV.**
- **Within the Vault**
	- New translations can be added within the `_Scripture` directory. 

## Verse Hotkeys:
- `Ctrl/Cmd + R` : Add WikiLinks to Citation, or Add Citation to WikiLinks (contextual) 
- `Ctrl/Cmd + Shift + R`: Cycle Translation
- `Ctrl/Cmd + Shift + Alt + R`: Cycle Translation (reverse direction)

## Bible Format Guide
### File Names:
```
<Number>_<Roman-Numeral-if-Applicable>_<Book-Name>.md
```
### File Contents
Non-Psalms:
```
Verse text ^CCVV
```
Psalms:
```
Verse text ^CCCVVV
```

## Bible sources:
- ESV:
	- Non-Psalms: [Bible](https://github.com/rwev/bible/tree/master)
	- Psalms: [mdbible – ESV Bible in Markdown](https://github.com/lguenth/mdbible) (includes choirmaster instructions and Psalm 119 letters)
- BSB-Strongs: [Berean Study Bible with Strongs](https://github.com/gapmiss/berean-study-bible-with-strongs).
- BYZ: [The New Testament in the original Greek: Byzantine textform](https://github.com/byztxt/byzantine-majority-text)

## Upcoming Fixes
- ESV text has no double quotation marks -> will be remidied
- ESV Psalms, Proverbs should have chapter numbers -> will be added
- BSB Psalm 119 should have letter headings -> will be added