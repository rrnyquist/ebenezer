'use strict';

var obsidian = require('obsidian');

/* 
   This plugin was originally based on Hotkeys++ and then modified for Rapid Logging.
   Now we modify it further so that a citation (e.g. "Psalms 1:1-2:3" or "Matthew 18:21-35")
   is converted into a series of wikilinks. The plugin “searches the vault” for the canonical file 
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

var RapidLogging = /** @class */ (function (_super) {
    __extends(RapidLogging, _super);
    function RapidLogging() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    
    RapidLogging.prototype.onload = function () {
        var _this = this;
        console.log('Loading RapidLogging plugin (Citation Toggle mode)');
        
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
    };
    
    RapidLogging.prototype.cleanSelected = function () {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var selectedText = this.getSelectedText(editor);
        var newString = selectedText.content.trim().replace(/(\r\n|\n|\r)/gm, ' ');
        newString = newString.replace(/  +/gm, ' ');
        editor.replaceRange(newString, selectedText.start, selectedText.end);
    };
    
    RapidLogging.prototype.onunload = function () {
        console.log('Unloading RapidLogging plugin (Citation Toggle mode)');
    };
    
    RapidLogging.prototype.getSelectedText = function (editor) {
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
    RapidLogging.prototype.cleanBookName = function(bookId) {
        var cleaned = bookId.replace(/^[0-9]+_/, '');
        return cleaned.replace(/_/g, ' ');
    };

    // ─── Helper: Find the canonical file name by searching the vault.
    // Compares cleaned basenames (case-insensitively). If no match, returns a default.
    RapidLogging.prototype.getCanonicalBookId = function(cleanName) {
        var vaultFiles = this.app.vault.getMarkdownFiles();
        for (var i = 0; i < vaultFiles.length; i++) {
            var file = vaultFiles[i];
            if (this.cleanBookName(file.basename).toLowerCase() === cleanName.toLowerCase()) {
                return file.basename;
            }
        }
        return "49_" + cleanName.replace(/ /g, '_');
    };

    // ─── Helper: Read a file’s content and extract all anchors for a given chapter.
    // For Psalms, the anchors in the file use three digits per part; for other books, two.
    // Returns an object { min: <minimum verse>, max: <maximum verse> }.
    RapidLogging.prototype.getChapterVerseRange = async function(canonicalBookId, chapterNumber, padLength) {
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
    RapidLogging.prototype.toggleCitations = async function () {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var selectedText = this.getSelectedText(editor);
        var newString;
        if (selectedText.content.indexOf('![[') !== -1) {
            // Convert wikilinks into a citation.
            var citation = this.generateCitationFromWikiLinks(selectedText.content);
            newString = selectedText.content + '\n' + citation;
        } else {
            // Convert a citation into wikilinks.
            var wikilinks = await this.generateWikiLinksFromCitation(selectedText.content);
            newString = wikilinks + '\n' + selectedText.content;
        }
        editor.replaceRange(newString, selectedText.start, selectedText.end);
    };

    // ─── Generate a citation string from existing wikilinks.
    // (For a single WikiLink, output "Book Chapter:Verse"; for multiple, output a range.)
    // For Psalms, the chapter and verse numbers are not padded with extra zeros.
    RapidLogging.prototype.generateCitationFromWikiLinks = function (text) {
        var regex = /!\[\[([^\]]+?)#\^(\d{2,3})(\d{2,3})\]\]/g;
        var match;
        var anchors = [];
        var bookId = "";
        while ((match = regex.exec(text)) !== null) {
            if (!bookId) { bookId = match[1]; }
            anchors.push(match[2] + match[3]);
        }
        if (anchors.length === 0) return text;
        var bookName = this.cleanBookName(bookId);
        var first = anchors[0];
        var halfLength = first.length / 2;
        var firstChapter = parseInt(first.substring(0, halfLength), 10);
        var firstVerse = parseInt(first.substring(halfLength), 10);
        if (anchors.length === 1) {
            if (bookName.toLowerCase() === "psalms") {
                return bookName + " " + firstChapter + ":" + firstVerse;
            } else {
                return bookName + " " + firstChapter + ":" + firstVerse;
            }
        }
        var last = anchors[anchors.length - 1];
        var halfLengthLast = last.length / 2;
        var lastChapter = parseInt(last.substring(0, halfLengthLast), 10);
        var lastVerse = parseInt(last.substring(halfLengthLast), 10);
        if (bookName.toLowerCase() === "psalms") {
            return bookName + " " + firstChapter + ":" + firstVerse +
                   "-" + lastChapter + ":" + lastVerse;
        } else {
            var pad = function(num, len) { return num.toString().padStart(len, '0'); };
            return bookName + " " + firstChapter + ":" + firstVerse +
                   "-" + lastChapter + ":" + lastVerse;
        }
    };

    // ─── Generate a WikiLinks line (wikilinks) from a citation.
    // Expected citation formats: either "Book Ch:Vs-Ch:Ve" or "Book Ch:V" (single WikiLink).
    // For a single-chapter citation the plugin generates every wikilink from the cited start verse to end verse.
    // For a multi-chapter citation, it reads the canonical file’s contents to determine available anchors.
    // (For Psalms, anchors in the file use three-digit padding; for other books, two digits.)
    RapidLogging.prototype.generateWikiLinksFromCitation = async function (text) {
        var rangeRegex = /^(\S+)\s+(\d+):(\d+)-(\d+):(\d+)$/;
        var singleRegex = /^(\S+)\s+(\d+):(\d+)$/;
        var match, rawBookName, startChapter, startVerse, endChapter, endVerse;
        if (match = text.trim().match(rangeRegex)) {
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
        if (startChapter === endChapter) {
            // Single-chapter: generate a link for every verse from start to end.
            for (var v = startVerse; v <= endVerse; v++) {
                refs.push("![["
                    + canonicalBookId
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
                    + canonicalBookId
                    + "#^" + pad(startChapter) + pad(v)
                    + "]]");
            }
            // For any intermediate chapters.
            for (var ch = startChapter + 1; ch < endChapter; ch++) {
                var midRange = await this.getChapterVerseRange(canonicalBookId, ch, padLength);
                if (midRange.max > 0) {
                    for (var v = midRange.min; v <= midRange.max; v++) {
                        refs.push("![["
                            + canonicalBookId
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
                    + canonicalBookId
                    + "#^" + pad(endChapter) + pad(v)
                    + "]]");
            }
        }
        return refs.join(" ");
    };

    return RapidLogging;
}(obsidian.Plugin));

module.exports = RapidLogging;

/* nosourcemap */
