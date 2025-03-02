'use strict';

var obsidian = require('obsidian');

/* 
   This plugin converts a citation (e.g. "Psalms 1:1-2:3" or "Matthew 18:21-35")
   into a series of wikilinks. The plugin searches the vault for the canonical file 
   (by comparing a cleaned book name) and then reads that file’s content to determine the available
   paragraph anchors for each chapter.

   When toggling, the plugin appends the generated conversion to the selected text instead
   of replacing it outright.
*/

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) { if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; } };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

// Helper: Convert between Arabic numerals and Roman numerals (supports 1-3)
function convertNumeral(input) {
    // Map supports only 1, 2, and 3.
    const mapping = { 1: "I", 2: "II", 3: "III" };
    if (typeof input === "number") {
      return mapping[input] || "";
    } else if (typeof input === "string") {
      // Reverse lookup: only works for "I", "II", and "III".
      for (const key in mapping) {
        if (mapping[key] === input) return parseInt(key, 10);
      }
    }
    return null;
  }
  
var EbenezerPlugin = /** @class */ (function (_super) {
    __extends(EbenezerPlugin, _super);
    function EbenezerPlugin() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    
    EbenezerPlugin.prototype.onload = function () {
        var _this = this;
        console.log('Loading Citation Toggle plugin');
        
        // ─── NEW CODE: Load settings and add settings tab with our toggle option.
        this.loadSettings().then(() => {
            this.addSettingTab(new EbenezerPluginSettingTab(this.app, this));
        });
        
        this.addCommand({
            id: 'toggle-citation',
            name: 'Toggle Citation/WikiLinks',
            // Our callback is async so we can await vault reads.
            callback: async function () { return await _this.toggleCitations(); },
            hotkeys: [
                {
                    modifiers: ['Mod'],
                    key: 'R',
                },
            ],
        });
        
        // NEW COMMAND: Cycle Translation Folders with mod+shift+R (forward)
        this.addCommand({
            id: 'cycle-translation',
            name: 'Cycle Translation Folders',
            callback: async function () { return await _this.cycleTranslation(); },
            hotkeys: [
                {
                    modifiers: ['Mod', 'Shift'],
                    key: 'R',
                },
            ],
        });
        
        // NEW COMMAND: Cycle Translation Folders in reverse with mod+alt+shift+R
        this.addCommand({
            id: 'cycle-translation-reverse',
            name: 'Cycle Translation Folders (Reverse)',
            callback: async function () { return await _this.cycleTranslationReverse(); },
            hotkeys: [
                {
                    modifiers: ['Mod', 'Alt', 'Shift'],
                    key: 'R',
                },
            ],
        });
    };
    
    EbenezerPlugin.prototype.cleanSelected = function () {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var selectedText = this.getSelectedText(editor);
        var newString = selectedText.content.trim().replace(/(\r\n|\n|\r)/gm, ' ');
        newString = newString.replace(/  +/gm, ' ');
        editor.replaceRange(newString, selectedText.start, selectedText.end);
    };
    
    EbenezerPlugin.prototype.onunload = function () {
        console.log('Unloading EbenezerPlugin plugin (Citation Toggle mode)');
    };
    
    EbenezerPlugin.prototype.getSelectedText = function (editor) {
        if (editor.somethingSelected()) {
            // When something is selected, get the entire lines covered.
            var cursorStart = editor.getCursor('from');
            var cursorEnd = editor.getCursor('to');
            var content = editor.getRange(
                { line: cursorStart.line, ch: 0 },
                { line: cursorEnd.line, ch: editor.getLine(cursorEnd.line).length }
            );
            return {
                start: { line: cursorStart.line, ch: 0 },
                end: { line: cursorEnd.line, ch: editor.getLine(cursorEnd.line).length },
                content: content,
            };
        } else {
            // Otherwise, use the current line.
            var lineNr = editor.getCursor().line;
            var contents = editor.getDoc().getLine(lineNr);
            var cursorStart = { line: lineNr, ch: 0 };
            var cursorEnd = { line: lineNr, ch: contents.length };
            var content = editor.getRange(cursorStart, cursorEnd);
            return { start: cursorStart, end: cursorEnd, content: content };
        }
    };

    // ─── Helper: Clean the book name.
    // Remove any leading digits/underscore and replace remaining underscores with a space.
    // e.g. "40_Matthew"  → "Matthew" ; "62_I_John" → "I John"
    EbenezerPlugin.prototype.cleanBookName = function(bookId) {
        var cleaned = bookId.replace(/^[0-9]+_/, '');
        return cleaned.replace(/_/g, ' ');
    };

    EbenezerPlugin.prototype.normalizeBookName = function(bookName) {
        // This regex matches a leading number followed by a space.
        let match = bookName.match(/^(\d+)(\s+)(.+)/);
        if (match) {
            let arabicNum = parseInt(match[1]);
            // Convert the Arabic numeral to Roman numeral.
            let roman = convertNumeral(arabicNum);
            return roman + match[2] + match[3];
        }
        // Otherwise, return the bookName unchanged.
        return bookName;
    };
    

    // ─── Helper: Find the canonical file name by searching the vault.
    // Compares cleaned basenames (case-insensitively). If no match, returns a default.
    EbenezerPlugin.prototype.getCanonicalBookId = function(cleanName) {
        // Normalize the input cleanName (e.g., "3 John" becomes "III John")
        cleanName = this.normalizeBookName(cleanName).toLowerCase();
        var vaultFiles = this.app.vault.getMarkdownFiles();
        for (var i = 0; i < vaultFiles.length; i++) {
            var file = vaultFiles[i];
            // Normalize the file basename (assuming cleanBookName strips out prefixes like "64_")
            var normalizedBookName = this.normalizeBookName(this.cleanBookName(file.basename)).toLowerCase();
            if (normalizedBookName === cleanName) {
                return file.basename;
            }
        }
        return "??_" + cleanName.replace(/ /g, '_');
    };
    
    // ─── Helper: Read a file’s content and extract all anchors for a given chapter.
    // For Psalms, the anchors in the file use three digits per part; for other books, two.
    // Returns an object { min: <minimum verse>, max: <maximum verse> }.
    EbenezerPlugin.prototype.getChapterVerseRange = async function(canonicalBookId, chapterNumber, padLength) {
        var vaultFiles = this.app.vault.getMarkdownFiles();
        var file = vaultFiles.find(function(f) { return f.basename === canonicalBookId; });
        if (!file) return { min: 1, max: 0 };
        var content = await this.app.vault.cachedRead(file);
        var regex;
        if (padLength === 3) {
            // Anchors like ^001001 (3 digits each for chapter and verse).
            regex = new RegExp(`\\^(\\d{3})(\\d{3})`, 'g');
        } else {
            // Anchors like ^1821 (2 digits each for chapter and verse).
            regex = new RegExp(`\\^(\\d{2})(\\d{2})`, 'g');
        }
        var chapterStr = (padLength === 3)
            ? chapterNumber.toString().padStart(3, '0')
            : chapterNumber.toString().padStart(2, '0');
        var verses = [];
        var m;
        while ((m = regex.exec(content)) !== null) {
            if (m[1] === chapterStr) {
                verses.push(parseInt(m[2], 10));
            }
        }
        if (verses.length === 0) return { min: 1, max: 0 };
        return { min: Math.min(...verses), max: Math.max(...verses) };
    };

    // ─── Toggle citations/WikiLinks.
    // If the selected text already contains wikilinks (i.e. "![["), convert them into a citation.
    // Otherwise, assume the text is a citation and convert it into wikilinks.
    // In either case, the generated output is appended (via newline) to the original text.
    EbenezerPlugin.prototype.toggleCitations = async function () {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var selectedText = this.getSelectedText(editor);
        var newString;
        if (selectedText.content.indexOf('![[') !== -1) {
            // Convert wikilinks into a citation.
            var citation = this.generateCitationFromWikiLinks(selectedText.content);
            // If no conversion occurred, do nothing.
            if (citation === selectedText.content) return;
            newString = selectedText.content + '\n' + citation;
        } else {
            // Convert a citation into wikilinks.
            var wikilinks = await this.generateWikiLinksFromCitation(selectedText.content);
            // If no conversion occurred, do nothing.
            if (wikilinks === selectedText.content) return;
            newString = wikilinks + '\n' + selectedText.content;
        }
        editor.replaceRange(newString, selectedText.start, selectedText.end);
    };
    
    // ─── Generate a citation string from existing wikilinks.
    // (For a single WikiLink, output "Book Chapter:Verse"; for multiple, output a range.)
    EbenezerPlugin.prototype.generateCitationFromWikiLinks = function (text) {
        var regex = /!\[\[([^\]]+?)#\^(\d{2,3})(\d{2,3})(?:\|[^\]]+)?\]\]/g;
        var match;
        var anchors = [];
        var bookId = "";
        while ((match = regex.exec(text)) !== null) {
            if (!bookId) { 
                bookId = match[1]; 
                // NEW CODE: Remove folder prefix if present.
                if (bookId.includes('/')) {
                    let parts = bookId.split('/');
                    bookId = parts[parts.length - 1];
                }
            }
            anchors.push(match[2] + match[3]);
        }
        if (anchors.length === 0) return text;
        
        var bookName = this.cleanBookName(bookId);
        var specialBooks = ["Obadiah", "II John", "III John", "Jude", "Philemon"];
        
        var first = anchors[0];
        var halfLength = first.length / 2;
        var firstChapter = parseInt(first.substring(0, halfLength), 10);
        var firstVerse = parseInt(first.substring(halfLength), 10);
        
        var citation = "";
        if (anchors.length === 1) {
            if (specialBooks.indexOf(bookName) !== -1 && firstChapter === 1) {
                // One-chapter books don't need a chapter identifier
                citation = bookName + " " + firstVerse;
            } else {
                // For a single WikiLink, output "Book Chapter:Verse"
                citation = bookName + " " + firstChapter + ":" + firstVerse;
            }
        } else {
            var last = anchors[anchors.length - 1];
            var halfLengthLast = last.length / 2;
            var lastChapter = parseInt(last.substring(0, halfLengthLast), 10);
            var lastVerse = parseInt(last.substring(halfLengthLast), 10);
            
            // If the book is a special book and both anchors are in chapter 1,
            // format as "Book Vstart-Vend" (dropping the chapter number)
            if (specialBooks.indexOf(bookName) !== -1 && firstChapter === 1 && lastChapter === 1) {
                citation = bookName + " " + firstVerse + "-" + lastVerse;
            }
            // If both anchors are in the same chapter, output as "Book Ch:Vstart-Vend"
            else if (firstChapter === lastChapter) {
                citation = bookName + " " + firstChapter + ":" + firstVerse + "-" + lastVerse;
            }
            // Else, output as "Book Ch:Vstart-Ch:Vend"
            else {
                citation = bookName + " " + firstChapter + ":" + firstVerse + "-" + lastChapter + ":" + lastVerse;
            }
        }
        // NEW CODE: If the toggle is on, convert a leading Roman numeral to Arabic.
        if (this.settings.CiteWithArabic) {
            citation = citation.replace(/^([IVXLCDM]+)(\s+)/, function(match, p1, p2) {
                return convertNumeral(p1) + p2;
            });
        }
        return citation;
    };
    
    // ─── Generate a WikiLinks line (wikilinks) from a citation.
    // Expected citation formats: either "Book Ch:Vs-Ch:Ve" or "Book Ch:V" (single WikiLink).
    // For a single-chapter citation the plugin generates every wikilink from the cited start verse to end verse.
    // For a multi-chapter citation, it reads the canonical file’s contents to determine available anchors.
    // (For Psalms, anchors in the file use three-digit padding; for other books, two digits.)
    EbenezerPlugin.prototype.generateWikiLinksFromCitation = async function (text) {
        // Regex for "Book Ch:Vs-Ch:Ve"
        var rangeRegex = /^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/;
        // Regex to handle "Book Ch:Vs-Ve"
        var singleChapterRangeRegex = /^(.+?)\s+(\d+):(\d+)-(\d+)$/;
        // Regex to handle "Book Ch:V"
        var singleRegex = /^(.+?)\s+(\d+):(\d+)$/;
        // Regex for one-chapter books when no colon is present: e.g. "Jude 5" or "Jude 5-7"
        var oneChapterRegex = /^(.+?)\s+(\d+)(?:-(\d+))?$/;
        var match, rawBookName, startChapter, startVerse, endChapter, endVerse;
    
        // If there is no colon, check for one-chapter books.
        if (text.indexOf(":") === -1) {
            if (match = text.trim().match(oneChapterRegex)) {
                rawBookName = match[1];
                // Determine the canonical book id early.
                var cleanedBookName = this.cleanBookName(this.normalizeBookName(rawBookName));
                // List of one-chapter books.
                var specialBooks = ["Obadiah", "II John", "III John", "Jude", "Philemon"];
                if (specialBooks.map(s => s.toLowerCase()).includes(cleanedBookName.toLowerCase())) {
                    startChapter = 1;
                    endChapter = 1;
                    startVerse = parseInt(match[2], 10);
                    endVerse = match[3] ? parseInt(match[3], 10) : startVerse;
                } else {
                    return text;
                }
            } else {
                return text;
            }
        } else if (match = text.trim().match(singleChapterRangeRegex)) {
            // Handles "Book Ch:Vs-Ve" (implying same chapter)
            rawBookName = match[1];
            startChapter = parseInt(match[2], 10);
            startVerse = parseInt(match[3], 10);
            endChapter = startChapter;
            endVerse = parseInt(match[4], 10);
        } else if (match = text.trim().match(rangeRegex)) {
            rawBookName = match[1];
            startChapter = parseInt(match[2], 10);
            startVerse = parseInt(match[3], 10);
            endChapter = parseInt(match[4], 10);
            endVerse = parseInt(match[5], 10);
        } else if (match = text.trim().match(singleRegex)) {
            rawBookName = match[1];
            startChapter = parseInt(match[2], 10);
            startVerse = parseInt(match[3], 10);
            endChapter = startChapter;
            endVerse = startVerse;
        } else {
            return text;
        }
        
        var cleanedBookName = this.cleanBookName(rawBookName);
        var canonicalBookId = this.getCanonicalBookId(cleanedBookName);
        // For wikilinks we use padding that matches the file’s anchors.
        var padLength = (cleanedBookName.toLowerCase() === "psalms") ? 3 : 2;
        var pad = function(num) {
            return num.toString().padStart(padLength, '0');
        };
        var refs = [];
        var bookLocation = `${this.settings.defaultTranslation}/${canonicalBookId}`;
        if (startChapter === endChapter) {
            // Single-chapter: generate a link for every verse from start to end.
            for (var v = startVerse; v <= endVerse; v++) {
                refs.push("![["
                    + bookLocation
                    + "#^" + pad(startChapter) + pad(v)
                    + "]]");
            }
        } else {
            // Multi-chapter:
            // For the starting chapter, read the file to determine its maximum verse.
            var startRange = await this.getChapterVerseRange(canonicalBookId, startChapter, padLength);
            var maxStart = (startRange.max > 0) ? startRange.max : startVerse;
            for (var v = startVerse; v <= maxStart; v++) {
                refs.push("![["
                    + bookLocation
                    + "#^" + pad(startChapter) + pad(v)
                    + "]]");
            }
            // For any intermediate chapters.
            for (var ch = startChapter + 1; ch < endChapter; ch++) {
                var midRange = await this.getChapterVerseRange(canonicalBookId, ch, padLength);
                if (midRange.max > 0) {
                    for (var v = midRange.min; v <= midRange.max; v++) {
                        refs.push("![["
                            + bookLocation
                            + "#^" + pad(ch) + pad(v)
                            + "]]");
                    }
                }
            }
            // For the ending chapter, assume anchors start at the chapter’s first verse.
            var endRange = await this.getChapterVerseRange(canonicalBookId, endChapter, padLength);
            var minEnd = (endRange.min > 0) ? endRange.min : 1;
            for (var v = minEnd; v <= endVerse; v++) {
                refs.push("![["
                    + bookLocation
                    + "#^" + pad(endChapter) + pad(v)
                    + "]]");
            }
        }
        return refs.join(" ");
    };

    // NEW METHOD: Cycle translation folders in wikilinks on the active line.
    EbenezerPlugin.prototype.cycleTranslation = async function() {
        // Use the dynamic Scripture directory from settings.
        const scriptureFolder = this.app.vault.getAbstractFileByPath(this.settings.scriptureDirectory);
        
        let translationFolders = [];
        if (scriptureFolder && scriptureFolder.children) {
        translationFolders = scriptureFolder.children
            .filter(child => child instanceof obsidian.TFolder)
            .map(folder => folder.name);
        }
        if (translationFolders.length === 0) return; // exit if no folders found
        
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var lineNr = editor.getCursor().line;
        var lineText = editor.getLine(lineNr);
        
        // Generalized regex with named groups:
        //  - (!\[\[) : capture the opening "![["
        //  - (?:\/?[^\/\]]+\/)* : non-capturing group that matches any leading directories (optional, repeated)
        //  - (?<translation>[^\/\]]+) : capture the translation folder (second-to-last element)
        //  - \/ : match the literal slash between the translation and the remainder
        //  - (?<rest>[^\/\]]+#\^[0-9]{4,6}\]\]) : capture the remainder (book name and anchor, then closing brackets)
        var regex = /(!\[\[)(?:\/?[^\/\]]+\/)*(?<translation>[^\/\]]+)\/(?<rest>[^\/\]]+#\^[0-9]{4,6}\]\])/g;
        
        // Replace each link on the line
        var newLineText = lineText.replace(regex, (match, prefix, _unused, _unused2, offset, string, groups) => {
        var currentTranslation = groups.translation;
        var currentIndex = translationFolders.indexOf(currentTranslation);
        var nextTranslation = translationFolders[0];
        if (currentIndex !== -1) {
            nextTranslation = translationFolders[(currentIndex + 1) % translationFolders.length];
        }
        // Build new link with the updated translation folder and captured remainder.
        return prefix + nextTranslation + "/" + groups.rest;
        });
        
        if (newLineText !== lineText) {
        editor.replaceRange(newLineText, { line: lineNr, ch: 0 }, { line: lineNr, ch: lineText.length });
        }
    };
    
    
    // NEW METHOD: Cycle translation folders in reverse.
    EbenezerPlugin.prototype.cycleTranslationReverse = async function() {
        // Use the dynamic Scripture directory from settings.
        const scriptureFolder = this.app.vault.getAbstractFileByPath(this.settings.scriptureDirectory);
        let translationFolders = [];
        if (scriptureFolder && scriptureFolder.children) {
        translationFolders = scriptureFolder.children
            .filter(child => child instanceof obsidian.TFolder)
            .map(folder => folder.name);
        }
        if (translationFolders.length === 0) return; // exit if no folders found
    
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var lineNr = editor.getCursor().line;
        var lineText = editor.getLine(lineNr);
    
        // Generalized regex with named groups:
        //  - (!\[\[) captures the opening "![["
        //  - (?:\/?[^\/\]]+\/)* optionally matches any leading directories
        //  - (?<translation>[^\/\]]+) captures the translation folder
        //  - \/ is the literal slash between the translation folder and the rest
        //  - (?<rest>[^\/\]]+#\^[0-9]{4,6}\]\]) captures the rest (book and anchor plus closing brackets)
        var regex = /(!\[\[)(?:\/?[^\/\]]+\/)*(?<translation>[^\/\]]+)\/(?<rest>[^\/\]]+#\^[0-9]{4,6}\]\])/g;
    
        // Replace each link on the line with the previous translation in the cycle.
        var newLineText = lineText.replace(regex, (match, prefix, _unused, _unused2, offset, string, groups) => {
        var currentTranslation = groups.translation;
        var currentIndex = translationFolders.indexOf(currentTranslation);
        var prevTranslation = translationFolders[translationFolders.length - 1];
        if (currentIndex !== -1) {
            prevTranslation = translationFolders[(currentIndex - 1 + translationFolders.length) % translationFolders.length];
        }
        // Build new link in the standardized format: ![[translation/rest]]
        return prefix + prevTranslation + "/" + groups.rest;
        });
    
        if (newLineText !== lineText) {
        editor.replaceRange(newLineText, { line: lineNr, ch: 0 }, { line: lineNr, ch: lineText.length });
        }
    };
  
    return EbenezerPlugin;
}(obsidian.Plugin));

// NEW CODE: Plugin Settings Support

// Default settings (added defaultTranslation)
var DEFAULT_SETTINGS = {
    CiteWithArabic: false,
    scriptureDirectory: '_Scripture',
    defaultTranslation: 'ESV'
};

// Load and save settings methods added to the plugin prototype.
EbenezerPlugin.prototype.loadSettings = async function () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
};

EbenezerPlugin.prototype.saveSettings = async function () {
    await this.saveData(this.settings);
};

// Define a settings tab for the plugin.
var EbenezerPluginSettingTab = /** @class */ (function (_super) {
    __extends(EbenezerPluginSettingTab, _super);
    function EbenezerPluginSettingTab(app, plugin) {
        var _this = _super.call(this, app, plugin) || this;
        _this.plugin = plugin;
        return _this;
    }
    EbenezerPluginSettingTab.prototype.display = function () {
        var containerEl = this.containerEl;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Citation Toggle Settings' });
        new obsidian.Setting(containerEl)
            .setName('Cite with Arabic Numerals')
            .setDesc('OFF: II Peter 1:1 | ON: 2 Peter 1:1')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.CiteWithArabic)
                .onChange(async (value) => {
                    this.plugin.settings.CiteWithArabic = value;
                    await this.plugin.saveSettings();
                }));
        new obsidian.Setting(containerEl)
        .setName('Scripture Directory')
        .setDesc('Set the root directory for scripture files (default: _Scripture)')
        .addText(text => {
            text.setPlaceholder('_Scripture')
                .setValue(this.plugin.settings.scriptureDirectory || '_Scripture')
                .onChange(async (value) => {
                    // Optionally store interim changes, if needed.
                });
            
            // Listen for when the input loses focus (blur)
            text.inputEl.addEventListener('blur', async () => {
                const newValue = text.getValue();
                if (newValue !== this.plugin.settings.scriptureDirectory) {
                    this.plugin.settings.scriptureDirectory = newValue;
                    await this.plugin.saveSettings();
                    // Re-render the settings tab to update the dropdown options.
                    this.display();
                }
            });
        });
        // NEW CODE: Add a dropdown to select the default translation folder.
        new obsidian.Setting(containerEl)
            .setName('Default Translation Folder')
            .setDesc('Select the default translation folder to use in wikilinks.')
            .addDropdown(drop => {
                const scriptureFolder = this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.scriptureDirectory);
                let translationFolders = [];
                if (scriptureFolder && scriptureFolder.children) {
                    translationFolders = scriptureFolder.children
                        .filter(child => child instanceof obsidian.TFolder)
                        .map(folder => folder.name);
                }
                if (translationFolders.length === 0) {
                    translationFolders = ['ESV'];
                }
                const options = {};
                translationFolders.forEach(folder => { options[folder] = folder; });
                drop.addOptions(options);
                drop.setValue(this.plugin.settings.defaultTranslation || 'ESV');
                drop.onChange(async (value) => {
                    this.plugin.settings.defaultTranslation = value;
                    await this.plugin.saveSettings();
                });
            });
    };

    return EbenezerPluginSettingTab;
}(obsidian.PluginSettingTab));

module.exports = EbenezerPlugin;
