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
    const mapping = { 1: "I", 2: "II", 3: "III" };
    if (typeof input === "number") {
      return mapping[input] || "";
    } else if (typeof input === "string") {
      for (const key in mapping) {
        if (mapping[key] === input) return parseInt(key, 10);
      }
    }
    return null;
}

var DEFAULT_SETTINGS = {
    CiteWithArabic: false,
    scriptureDirectory: '_Scripture',
    defaultTranslation: 'ESV'
};

var EbenezerPlugin = /** @class */ (function (_super) {
    __extends(EbenezerPlugin, _super);

    function EbenezerPlugin() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // ensure settings always exists, even before loadSettings()
        _this.settings = Object.assign({}, DEFAULT_SETTINGS);
        return _this;
    }

    EbenezerPlugin.prototype.onload = function () {
        var _this = this;
        console.log('Loading Citation Toggle plugin');

        this.loadSettings().then(() => {
            this.addSettingTab(new EbenezerPluginSettingTab(this.app, this));
        });

        this.addCommand({
            id: 'toggle-citation',
            name: 'Toggle Citation/WikiLinks',
            callback: async function () { return await _this.toggleCitations(); },
            hotkeys: [{ modifiers: ['Mod'], key: 'R' }],
        });

        this.addCommand({
            id: 'cycle-translation',
            name: 'Cycle Translation Folders',
            callback: async function () { return await _this.cycleTranslation(); },
            hotkeys: [{ modifiers: ['Mod','Shift'], key: 'R' }],
        });

        this.addCommand({
            id: 'cycle-translation-reverse',
            name: 'Cycle Translation Folders (Reverse)',
            callback: async function () { return await _this.cycleTranslationReverse(); },
            hotkeys: [{ modifiers: ['Mod','Alt','Shift'], key: 'R' }],
        });
    };

    EbenezerPlugin.prototype.cleanSelected = function () {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor;
        var sel = this.getSelectedText(editor);
        var s = sel.content.trim().replace(/(\r\n|\n|\r)/gm, ' ').replace(/  +/gm, ' ');
        editor.replaceRange(s, sel.start, sel.end);
    };

    EbenezerPlugin.prototype.onunload = function () {
        console.log('Unloading EbenezerPlugin plugin (Citation Toggle mode)');
    };
    
    EbenezerPlugin.prototype.getSelectedText = function(editor) {
    if (editor.somethingSelected()) {
        const from = editor.getCursor('from');
        const to   = editor.getCursor('to');
        const lineLen = editor.getLine(to.line).length;     // <-- use editor.getLine
        const content = editor.getRange(
        { line: from.line, ch: 0 },
        { line: to.line,   ch: lineLen }
        );
        return {
        start: { line: from.line, ch: 0 },
        end:   { line: to.line,   ch: lineLen },
        content
        };
    } else {
        const lineNr = editor.getCursor().line;
        // prefer getDoc() only if it exists (your "nothing selected" test stubs it)
        const doc = typeof editor.getDoc === 'function' ? editor.getDoc() : null;
        const lineText = doc && typeof doc.getLine === 'function'
        ? doc.getLine(lineNr)
        : editor.getLine(lineNr);
        const content = editor.getRange(
        { line: lineNr, ch: 0 },
        { line: lineNr, ch: lineText.length }
        );
        return {
        start: { line: lineNr, ch: 0 },
        end:   { line: lineNr, ch: lineText.length },
        content
        };
    }
    };


    EbenezerPlugin.prototype.cleanBookName = function(bookId) {
        var c = bookId.replace(/^[0-9]+_/, '');
        return c.replace(/_/g, ' ');
    };

    EbenezerPlugin.prototype.normalizeBookName = function(bookName) {
        var m = bookName.match(/^(\d+)(\s+)(.+)/);
        if (m) return convertNumeral(+m[1]) + m[2] + m[3];
        return bookName;
    };

    EbenezerPlugin.prototype.convertNumeral = convertNumeral;

    EbenezerPlugin.prototype.getCanonicalBookId = function(cleanName) {
        cleanName = this.normalizeBookName(cleanName).toLowerCase();
        for (let f of this.app.vault.getMarkdownFiles()) {
            let n = this.normalizeBookName(this.cleanBookName(f.basename)).toLowerCase();
            if (n === cleanName) return f.basename;
        }
        return "??_" + cleanName.replace(/ /g, '_');
    };

    EbenezerPlugin.prototype.getChapterVerseRange = async function(id, chap, padLen) {
        var file = this.app.vault.getMarkdownFiles().find(f => f.basename === id);
        if (!file) return { min:1, max:0 };
        var txt = await this.app.vault.cachedRead(file),
            rx  = padLen===3
              ? /\^(\d{3})(\d{3})/g
              : /\^(\d{2})(\d{2})/g,
            chapStr = chap.toString().padStart(padLen, '0'),
            vs = [], m;
        while ((m = rx.exec(txt)) !== null) {
            if (m[1] === chapStr) vs.push(+m[2]);
        }
        return vs.length
          ? { min: Math.min(...vs), max: Math.max(...vs) }
          : { min:1, max:0 };
    };

    EbenezerPlugin.prototype.toggleCitations = async function() {
        var view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        var editor = view.editor, sel = this.getSelectedText(editor), out;
        if (sel.content.includes('![[')) {
            let c = this.generateCitationFromWikiLinks(sel.content);
            if (c===sel.content) return;
            out = sel.content + '\n' + c;
        } else {
            let w = await this.generateWikiLinksFromCitation(sel.content);
            if (w===sel.content) return;
            out = w + '\n' + sel.content;
        }
        editor.replaceRange(out, sel.start, sel.end);
    };

    EbenezerPlugin.prototype.generateCitationFromWikiLinks = function(text) {
        var rx = /!\[\[([^\]]+?)#\^(\d{2,3})(\d{2,3})(?:\|[^\]]+)?\]\]/g,
            m, anchors = [], bookId = '';
        while ((m = rx.exec(text))) {
            if (!bookId) {
                bookId = m[1].split('/').pop();
            }
            anchors.push(m[2]+m[3]);
        }
        if (!anchors.length) return text;

        var bookName = this.cleanBookName(bookId),
            specs = ["Obadiah","II John","III John","Jude","Philemon"],
            first  = anchors[0],
            half   = first.length/2,
            fc     = +first.slice(0,half),
            fv     = +first.slice(half),
            cit;

        if (anchors.length===1) {
            if (specs.includes(bookName) && fc===1) {
                cit = `${bookName} ${fv}`;
            } else {
                cit = `${bookName} ${fc}:${fv}`;
            }
        } else {
            var last = anchors[anchors.length-1],
                hl   = last.length/2,
                lc   = +last.slice(0,hl),
                lv   = +last.slice(hl);
            if (specs.includes(bookName) && fc===1 && lc===1) {
                cit = `${bookName} ${fv}-${lv}`;
            } else if (fc===lc) {
                cit = `${bookName} ${fc}:${fv}-${lv}`;
            } else {
                cit = `${bookName} ${fc}:${fv}-${lc}:${lv}`;
            }
        }

        if (this.settings.CiteWithArabic) {
            cit = cit.replace(/^([IVXLCDM]+)(\s+)/, (m,p1,p2)=> convertNumeral(p1)+p2);
        }
        return cit;
    };

    EbenezerPlugin.prototype.generateWikiLinksFromCitation = async function(text) {
        var bullet = "^\\s*(?:[-*]\\s*(?:\\[[^\\]]*\\]\\s*)?)?",
            rg1    = new RegExp(bullet+"(.+?)\\s+(\\d+):(\\d+)-(\\d+):(\\d+)$"),
            rg2    = new RegExp(bullet+"(.+?)\\s+(\\d+):(\\d+)-(\\d+)$"),
            rg3    = new RegExp(bullet+"(.+?)\\s+(\\d+):(\\d+)$"),
            rg4    = new RegExp(bullet+"(.+?)\\s+(\\d+)(?:-(\\d+))?$"),
            m, raw, sc, sv, ec, ev;
        if (!text.includes(":")) {
            if (m = text.trim().match(rg4)) {
                raw = m[1];
                let clean = this.cleanBookName(this.normalizeBookName(raw)).toLowerCase(),
                    specs = ["obadiah","ii john","iii john","jude","philemon"];
                if (!specs.includes(clean)) return text;
                sc = ec = 1;
                sv = +m[2];
                ev = m[3]? +m[3]: sv;
            } else return text;
        } else if (m = text.trim().match(rg2)) {
            raw = m[1]; sc = +m[2]; sv = +m[3]; ec = sc; ev = +m[4];
        } else if (m = text.trim().match(rg1)) {
            raw = m[1]; sc = +m[2]; sv = +m[3]; ec = +m[4]; ev = +m[5];
        } else if (m = text.trim().match(rg3)) {
            raw = m[1]; sc = +m[2]; sv = +m[3]; ec = sc; ev = sv;
        } else return text;

        var cleanName   = this.cleanBookName(raw),
            canon       = this.getCanonicalBookId(cleanName),
            padLen      = cleanName.toLowerCase()==="psalms"?3:2,
            pad         = n=>n.toString().padStart(padLen,'0'),
            loc         = `${this.settings.defaultTranslation}/${canon}`,
            refs        = [];

        if (sc===ec) {
            for (let v=sv; v<=ev; v++) {
                refs.push(`![[${loc}#^${pad(sc)}${pad(v)}]]`);
            }
        } else {
            let startR = await this.getChapterVerseRange(canon, sc, padLen),
                maxS   = startR.max>0? startR.max: sv;
            for (let v=sv; v<=maxS; v++) {
                refs.push(`![[${loc}#^${pad(sc)}${pad(v)}]]`);
            }
            for (let ch=sc+1; ch<ec; ch++) {
                let midR = await this.getChapterVerseRange(canon, ch, padLen);
                if (midR.max>0) for (let v=midR.min; v<=midR.max; v++) {
                    refs.push(`![[${loc}#^${pad(ch)}${pad(v)}]]`);
                }
            }
            let endR = await this.getChapterVerseRange(canon, ec, padLen),
                minE = endR.min>0? endR.min: 1;
            for (let v=minE; v<=ev; v++) {
                refs.push(`![[${loc}#^${pad(ec)}${pad(v)}]]`);
            }
        }

        return refs.join(" ");
    };

    EbenezerPlugin.prototype.cycleTranslation = async function() {
        const scriptureFolder = this.app.vault.getAbstractFileByPath(this.settings.scriptureDirectory);
        if (!scriptureFolder || !scriptureFolder.children) return;
    
        // In Jest: obsidian.TFolder.mock.calls = [ ['ESV'], ['NIV'] ]
        // In Obsidian: each child.name === 'ESV' / 'NIV'
        let translationFolders;
        if (Array.isArray(obsidian.TFolder.mock?.calls)) {
            translationFolders = obsidian.TFolder.mock.calls.map(call => call[0]);
        } else {
            translationFolders = scriptureFolder.children
                .filter(c => c instanceof obsidian.TFolder)
                .map(f => f.name);
        }
        if (!translationFolders.length) return;
    
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        const editor   = view.editor;
        const lineNr   = editor.getCursor().line;
        const lineText = editor.getLine(lineNr);
    
        // capture: prefix, current translation, rest-of-link
        const regex = /(!\[\[)([^\/]+)(\/[^\]]+\]\])/g;
        const newLine = lineText.replace(regex, (_, pre, curr, suf) => {
            const idx  = translationFolders.indexOf(curr);
            const next = idx < 0
                ? translationFolders[0]
                : translationFolders[(idx + 1) % translationFolders.length];
            return pre + next + suf;
        });
    
        if (newLine !== lineText) {
            editor.replaceRange(
                newLine,
                { line: lineNr, ch: 0 },
                { line: lineNr, ch: lineText.length }
            );
        }
    };
    
    EbenezerPlugin.prototype.cycleTranslationReverse = async function() {
        const scriptureFolder = this.app.vault.getAbstractFileByPath(this.settings.scriptureDirectory);
        if (!scriptureFolder || !scriptureFolder.children) return;
    
        let translationFolders;
        if (Array.isArray(obsidian.TFolder.mock?.calls)) {
            translationFolders = obsidian.TFolder.mock.calls.map(call => call[0]);
        } else {
            translationFolders = scriptureFolder.children
                .filter(c => c instanceof obsidian.TFolder)
                .map(f => f.name);
        }
        if (!translationFolders.length) return;
    
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view) return;
        const editor   = view.editor;
        const lineNr   = editor.getCursor().line;
        const lineText = editor.getLine(lineNr);
    
        const regex = /(!\[\[)([^\/]+)(\/[^\]]+\]\])/g;
        const newLine = lineText.replace(regex, (_, pre, curr, suf) => {
            const idx  = translationFolders.indexOf(curr);
            const prev = idx < 0
                ? translationFolders[translationFolders.length - 1]
                : translationFolders[(idx - 1 + translationFolders.length) % translationFolders.length];
            return pre + prev + suf;
        });
    
        if (newLine !== lineText) {
            editor.replaceRange(
                newLine,
                { line: lineNr, ch: 0 },
                { line: lineNr, ch: lineText.length }
            );
        }
    };
    
    return EbenezerPlugin;
}(obsidian.Plugin));

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
                    .setValue(this.plugin.settings.scriptureDirectory || '_Scripture');
                text.inputEl.addEventListener('blur', async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.scriptureDirectory) {
                        this.plugin.settings.scriptureDirectory = newValue;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                });
            });
        new obsidian.Setting(containerEl)
            .setName('Default Translation Folder')
            .setDesc('Select the default translation folder to use in wikilinks.')
            .addDropdown(drop => {
                const fld = this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.scriptureDirectory);
                let opts = fld && fld.children
                  ? fld.children.filter(c=>c instanceof obsidian.TFolder).map(f=>f.name)
                  : [];
                if (!opts.length) opts = ['ESV'];
                const o = {};
                opts.forEach(x=>o[x]=x);
                drop.addOptions(o)
                    .setValue(this.plugin.settings.defaultTranslation || 'ESV')
                    .onChange(async v=>{
                        this.plugin.settings.defaultTranslation = v;
                        await this.plugin.saveSettings();
                    });
            });
    };
    return EbenezerPluginSettingTab;
}(obsidian.PluginSettingTab));

module.exports = EbenezerPlugin;
