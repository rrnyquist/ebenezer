// __mocks__/obsidian.js
function Plugin() {}
function PluginSettingTab(app, plugin) { this.app = app; this.plugin = plugin; }
function MarkdownView() { this.editor = { somethingSelected: () => false }; }
function TFolder(name) { this.name = name; }

// stub out any other methods your code touches (e.g. vault.getMarkdownFiles, etc.)
function Vault() {
  this.getMarkdownFiles = () => [];
  this.cachedRead     = async () => '';
  this.getAbstractFileByPath = () => null;
}
function Workspace() {
  this.getActiveViewOfType = () => null;
}
function App() {
  this.vault     = new Vault();
  this.workspace = new Workspace();
}

module.exports = {
  Plugin,
  PluginSettingTab,
  MarkdownView,
  TFolder,
  Vault,
  Workspace,
  App,
  // ...add any other exports your plugin reads directly...
};
