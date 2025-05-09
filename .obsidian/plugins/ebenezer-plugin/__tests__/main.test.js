// __tests__/EbenezerPlugin.test.js
jest.mock('obsidian');          // <-- tells Jest “use the manual mock”
const obsidian = require('obsidian');
const path   = require('path');
const EbenezerPlugin = require(path.resolve(__dirname, '../main.js'));

describe('Convert numeral helper', () => {
  test('convert number to roman for 1-3', () => {
    expect(EbenezerPlugin.prototype.convertNumeral(1)).toBe('I')
    expect(EbenezerPlugin.prototype.convertNumeral(2)).toBe('II')
    expect(EbenezerPlugin.prototype.convertNumeral(3)).toBe('III')
  })
  test('convert number outside range returns empty string', () => {
    expect(EbenezerPlugin.prototype.convertNumeral(4)).toBe('')
  })
  test('convert roman to number for I, II, III', () => {
    expect(EbenezerPlugin.prototype.convertNumeral('I')).toBe(1)
    expect(EbenezerPlugin.prototype.convertNumeral('II')).toBe(2)
    expect(EbenezerPlugin.prototype.convertNumeral('III')).toBe(3)
  })
  test('convert unknown roman returns null', () => {
    expect(EbenezerPlugin.prototype.convertNumeral('IV')).toBeNull()
  })
  test('convert non-string/number returns null', () => {
    expect(EbenezerPlugin.prototype.convertNumeral(null)).toBeNull()
  })
})

describe('Book name helpers', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
  })

  test('cleanBookName strips prefix numbers and underscores', () => {
    expect(plugin.cleanBookName('40_Matthew')).toBe('Matthew')
    expect(plugin.cleanBookName('62_I_John')).toBe('I John')
  })

  test('normalizeBookName converts leading arabic to roman', () => {
    expect(plugin.normalizeBookName('3 John')).toBe('III John')
    expect(plugin.normalizeBookName('Matthew')).toBe('Matthew')
  })
})

describe('Settings load and save', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    plugin.loadData = jest.fn().mockResolvedValue({
      CiteWithArabic: true,
      defaultTranslation: 'NIV'
    })
    plugin.saveData = jest.fn().mockResolvedValue()
  })

  test('loadSettings merges defaults and stored', async () => {
    await plugin.loadSettings()
    expect(plugin.settings).toEqual({
      CiteWithArabic: true,
      scriptureDirectory: '_Scripture',
      defaultTranslation: 'NIV'
    })
  })

  test('saveSettings calls saveData with current settings', async () => {
    plugin.settings = { foo: 'bar' }
    await plugin.saveSettings()
    expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings)
  })
})

describe('getCanonicalBookId', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    plugin.app = {
      vault: {
        getMarkdownFiles: () => [
          { basename: '62_I_John' },
          { basename: '01_Psalms' }
        ]
      }
    }
  })

  test('returns matching basename when found', () => {
    expect(plugin.getCanonicalBookId('I John')).toBe('62_I_John')
  })

  test('returns default when not found', () => {
    expect(plugin.getCanonicalBookId('Nonexistent')).toBe('??_nonexistent')
  })
})

describe('getChapterVerseRange', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    plugin.app = {
      vault: {
        getMarkdownFiles: () => [ { basename: 'Sample' } ],
        cachedRead: jest.fn().mockResolvedValue(
          '^0101 ^0102 ^0203 ^001001 ^001002 ^002003'
        )
      }
    }
  })

  test('padLength 2 extracts verses for chapter 1', async () => {
    const range = await plugin.getChapterVerseRange('Sample', 1, 2)
    expect(range).toEqual({ min: 1, max: 2 })
  })

  test('padLength 3 extracts verses for chapter 1', async () => {
    const range = await plugin.getChapterVerseRange('Sample', 1, 3)
    expect(range).toEqual({ min: 1, max: 2 })
  })

  test('returns {1,0} when file not found', async () => {
    const r2 = await plugin.getChapterVerseRange('Missing', 1, 2)
    expect(r2).toEqual({ min: 1, max: 0 })
  })

  test('returns {1,0} when no verses match', async () => {
    plugin.app.vault.cachedRead = jest.fn().mockResolvedValue('^0201')
    const r3 = await plugin.getChapterVerseRange('Sample', 1, 2)
    expect(r3).toEqual({ min: 1, max: 0 })
  })
})

describe('generateCitationFromWikiLinks', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    plugin.settings = { CiteWithArabic: false }
  })

  test('single link produces Book Ch:V', () => {
    const text = '![[Book#^0101]]'
    expect(plugin.generateCitationFromWikiLinks(text)).toBe('Book 1:1')
  })

  test('special one-chapter book drops chapter', () => {
    const text = '![[Jude#^0105]]'
    expect(plugin.generateCitationFromWikiLinks(text)).toBe('Jude 5')
  })

  test('multiple same-chapter links produce range', () => {
    const text = '![[Book#^0101]] ![[Book#^0103]]'
    expect(plugin.generateCitationFromWikiLinks(text)).toBe('Book 1:1-3')
  })

  test('links across chapters produce Ch:V-Ch:V', () => {
    const text = '![[Book#^0101]] ![[Book#^0202]]'
    expect(plugin.generateCitationFromWikiLinks(text)).toBe('Book 1:1-2:2')
  })

  test('CiteWithArabic converts leading roman', () => {
    plugin.settings.CiteWithArabic = true
    const text = '![[II_Peter#^0101]]'
    expect(plugin.generateCitationFromWikiLinks(text)).toBe('2 Peter 1:1')
  })
})

describe('generateWikiLinksFromCitation', () => {
  let plugin
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    plugin.settings = { defaultTranslation: 'ESV' }
    plugin.getCanonicalBookId = jest.fn().mockReturnValue('John')
    plugin.getChapterVerseRange = jest.fn(async (id, ch) => {
      if (ch === 3) return { min: 1, max: 17 }
      return { min: 1, max: 0 }
    })
  })

  test('single verse produces one link', async () => {
    const out = await plugin.generateWikiLinksFromCitation('John 3:16')
    expect(out).toBe('![[ESV/John#^0316]]')
  })

  test('same-chapter range', async () => {
    const out = await plugin.generateWikiLinksFromCitation('John 3:16-18')
    expect(out).toBe(
      '![[ESV/John#^0316]] ![[ESV/John#^0317]] ![[ESV/John#^0318]]'
    )
  })

  test('multi-chapter range', async () => {
    const out = await plugin.generateWikiLinksFromCitation('John 3:16-4:2')
    expect(out).toBe(
      '![[ESV/John#^0316]] ![[ESV/John#^0317]] ![[ESV/John#^0401]] ![[ESV/John#^0402]]'
    )
  })

  test('one-chapter special book range', async () => {
    plugin.getCanonicalBookId.mockReturnValue('Jude')
    const out = await plugin.generateWikiLinksFromCitation('Jude 5-7')
    expect(out).toBe(
      '![[ESV/Jude#^0105]] ![[ESV/Jude#^0106]] ![[ESV/Jude#^0107]]'
    )
  })

  test('non-matching text returns input', async () => {
    const txt = 'random text'
    expect(await plugin.generateWikiLinksFromCitation(txt)).toBe(txt)
  })
})

describe('cycleTranslation and cycleTranslationReverse', () => {
  let plugin, editor, view
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    editor = {
      getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
      getLine: jest.fn(),
      replaceRange: jest.fn()
    }
    view = { editor }
    plugin.app = {
      vault: {
        getAbstractFileByPath: jest.fn(() => ({
          children: [
            new obsidian.TFolder('ESV'),
            new obsidian.TFolder('NIV')
          ]
        }))
      },
      workspace: {
        getActiveViewOfType: jest.fn().mockReturnValue(view)
      }
    }
  })

  test('cycleTranslation advances folder', async () => {
    editor.getLine.mockReturnValue('![[NIV/Book#^0101]]')
    await plugin.cycleTranslation()
    expect(editor.replaceRange).toHaveBeenCalledWith(
      '![[ESV/Book#^0101]]',
      { line: 0, ch: 0 },
      { line: 0, ch: editor.getLine().length }
    )
  })

  test('cycleTranslationReverse goes to previous folder', async () => {
    editor.getLine.mockReturnValue('![[ESV/Book#^0101]]')
    await plugin.cycleTranslationReverse()
    expect(editor.replaceRange).toHaveBeenCalledWith(
      '![[NIV/Book#^0101]]',
      { line: 0, ch: 0 },
      { line: 0, ch: editor.getLine().length }
    )
  })
})

describe('getSelectedText and cleanSelected', () => {
  let plugin, editor, view
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    editor = {
      somethingSelected: jest.fn(),
      getCursor: jest.fn(),
      getLine: jest.fn(),
      getRange: jest.fn(),
      replaceRange: jest.fn()
    }
    view = { editor }
    plugin.app = {
      workspace: {
        getActiveViewOfType: jest.fn().mockReturnValue(view)
      }
    }
  })

  test('getSelectedText when somethingSelected', () => {
    editor.somethingSelected.mockReturnValue(true)
    editor.getCursor
      .mockImplementationOnce(() => ({ line: 1, ch: 5 }))
      .mockImplementationOnce(() => ({ line: 2, ch: 3 }))
    editor.getLine.mockReturnValueOnce('line2content')
    editor.getRange.mockReturnValue('full lines')
    const sel = plugin.getSelectedText(editor)
    expect(sel).toEqual({
      start: { line: 1, ch: 0 },
      end: { line: 2, ch: 'line2content'.length },
      content: 'full lines'
    })
  })

  test('getSelectedText when nothing selected', () => {
    editor.somethingSelected.mockReturnValue(false)
    editor.getCursor.mockReturnValue({ line: 3, ch: 2 })
    editor.getDoc = () => ({ getLine: () => 'single line' })
    editor.getRange.mockReturnValue('single line')
    const sel = plugin.getSelectedText(editor)
    expect(sel).toEqual({
      start: { line: 3, ch: 0 },
      end: { line: 3, ch: 'single line'.length },
      content: 'single line'
    })
  })

  test('cleanSelected trims and normalizes whitespace', () => {
    const sel = { start: {}, end: {}, content: ' a \n b  c ' }
    plugin.getSelectedText = jest.fn().mockReturnValue(sel)
    plugin.app.workspace.getActiveViewOfType.mockReturnValue(view)
    plugin.cleanSelected()
    expect(editor.replaceRange).toHaveBeenCalledWith(
      'a b c',
      sel.start,
      sel.end
    )
  })
})

describe('toggleCitations', () => {
  let plugin, editor, view
  beforeEach(() => {
    plugin = new EbenezerPlugin()
    editor = { replaceRange: jest.fn() }
    view = { editor }
    plugin.getSelectedText = jest.fn()
    plugin.generateCitationFromWikiLinks = jest.fn()
    plugin.generateWikiLinksFromCitation = jest.fn()
    plugin.app = {
      workspace: {
        getActiveViewOfType: jest.fn().mockReturnValue(view)
      }
    }
  })

  test('toggles wikilinks to citation', async () => {
    const sel = { content: 'with ![[link]]', start: {}, end: {} }
    plugin.getSelectedText.mockReturnValue(sel)
    plugin.generateCitationFromWikiLinks.mockReturnValue('Citation')
    await plugin.toggleCitations()
    expect(editor.replaceRange).toHaveBeenCalledWith(
      'with ![[link]]\nCitation',
      sel.start,
      sel.end
    )
  })

  test('toggles citation to wikilinks', async () => {
    const sel = { content: 'John 3:16', start: {}, end: {} }
    plugin.getSelectedText.mockReturnValue(sel)
    plugin.generateWikiLinksFromCitation.mockResolvedValue('![[link]]')
    await plugin.toggleCitations()
    expect(editor.replaceRange).toHaveBeenCalledWith(
      '![[link]]\nJohn 3:16',
      sel.start,
      sel.end
    )
  })
})
