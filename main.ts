import { App, ButtonComponent, DropdownComponent, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, Platform } from "obsidian";

const defaultSettings: CustomFramesSettings = {
	frames: [],
	padding: 5
};
const presets: Record<string, CustomFrame> = {
	"keep": {
		url: "https://keep.google.com",
		displayName: "Google Keep",
		icon: "files",
		hideOnMobile: true,
		minimumWidth: 370,
		customCss: `/* hide the menu bar and the "Keep" text */
.PvRhvb-qAWA2, .gb_2d.gb_Zc { 
	display: none !important; 
}`
	},
	"obsidian": {
		url: "https://forum.obsidian.md/",
		displayName: "Obsidian Forum",
		icon: "edit",
		hideOnMobile: true,
		minimumWidth: 367,
		customCss: ""
	},
	"notion": {
		url: "https://www.notion.so/",
		displayName: "Notion",
		icon: "box",
		hideOnMobile: true,
		minimumWidth: 400,
		customCss: ""
	}
};

interface CustomFramesSettings {
	frames: CustomFrame[];
	padding: number;
}

interface CustomFrame {
	url: string;
	displayName: string;
	icon: string;
	hideOnMobile: boolean;
	minimumWidth: number;
	customCss: string;
}

export default class CustomFramesPlugin extends Plugin {

	settings: CustomFramesSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		for (let frame of this.settings.frames) {
			if (!frame.url || !frame.displayName)
				continue;
			let name = `custom-frames-${frame.displayName.toLowerCase().replace(/\s/g, "-")}`;
			if (Platform.isMobileApp && frame.hideOnMobile) {
				console.log(`Skipping frame ${name} which is hidden on mobile`);
				continue;
			}
			try {
				console.log(`Registering frame ${name} for URL ${frame.url}`);

				this.registerView(name, l => new CustomFrameView(l, this.settings, frame, name));
				this.addCommand({
					id: `open-${name}`,
					name: `Open ${frame.displayName}`,
					callback: () => this.openLeaf(name),
				});
			} catch {
				console.error(`Couldn't register frame ${name}, is there already one with the same name?`);
			}
		}

		this.addSettingTab(new CustomFramesSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, defaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async openLeaf(name: string): Promise<void> {
		if (!this.app.workspace.getLeavesOfType(name).length)
			await this.app.workspace.getRightLeaf(false).setViewState({ type: name });
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(name)[0]);
	}
}

class CustomFrameView extends ItemView {

	private settings: CustomFramesSettings;
	private frame: CustomFrame;
	private name: string;

	constructor(leaf: WorkspaceLeaf, settings: CustomFramesSettings, frame: CustomFrame, name: string) {
		super(leaf);
		this.settings = settings;
		this.frame = frame;
		this.name = name;
	}

	onload(): void {
		this.contentEl.empty();
		this.contentEl.addClass("custom-frames-view");

		let frame: HTMLIFrameElement | any;
		if (Platform.isDesktopApp) {
			frame = document.createElement("webview");
			frame.setAttribute("allowpopups", "");
			frame.addEventListener("dom-ready", () => {
				frame.insertCSS(this.frame.customCss);

				if (this.frame.minimumWidth) {
					let parent = this.contentEl.closest<HTMLElement>(".workspace-split.mod-horizontal");
					if (parent) {
						let minWidth = `${this.frame.minimumWidth + 2 * this.settings.padding}px`;
						if (parent.style.width < minWidth)
							parent.style.width = minWidth;
					}
				}
			});
		}
		else {
			frame = document.createElement("iframe");
			frame.setAttribute("sandbox", "allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation");
			frame.setAttribute("allow", "encrypted-media; fullscreen; oversized-images; picture-in-picture; sync-xhr; geolocation;");
		}
		frame.addClass("custom-frames-frame");
		frame.setAttribute("style", `padding: ${this.settings.padding}px`);
		frame.setAttribute("src", this.frame.url);
		this.contentEl.appendChild(frame);
	}

	getViewType(): string {
		return this.name;
	}

	getDisplayText(): string {
		return this.frame.displayName;
	}

	getIcon(): string {
		return this.frame.icon ? `lucide-${this.frame.icon}` : "documents";
	}
}

class CustomFramesSettingTab extends PluginSettingTab {

	plugin: CustomFramesPlugin;

	constructor(app: App, plugin: CustomFramesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.createEl("h2", { text: "Custom Frames Settings" });
		this.containerEl.createEl("p", { text: "Note that Obsidian has to be restarted or reloaded for most of these settings to take effect.", cls: "mod-warning" });

		new Setting(this.containerEl)
			.setName("Frame Padding")
			.setDesc("The padding that should be left around the inside of custom frame panes, in pixels.")
			.addText(t => {
				t.inputEl.type = "number";
				t.setValue(String(this.plugin.settings.padding));
				t.onChange(async v => {
					this.plugin.settings.padding = v.length ? Number(v) : defaultSettings.padding;
					await this.plugin.saveSettings();
				});
			});

		for (let frame of this.plugin.settings.frames) {
			let heading = this.containerEl.createEl("h3", { text: frame.displayName || "Unnamed Frame" });

			new Setting(this.containerEl)
				.setName("Display Name")
				.setDesc("The display name that this frame should have.")
				.addText(t => {
					t.setValue(frame.displayName);
					t.onChange(async v => {
						frame.displayName = v;
						heading.setText(frame.displayName || "Unnamed Frame");
						await this.plugin.saveSettings();
					});
				});
			new Setting(this.containerEl)
				.setName("Icon")
				.setDesc(createFragment(f => {
					f.createSpan({ text: "The icon that this frame's pane should have. The names of any " });
					f.createEl("a", { text: "Lucide icons", href: "https://lucide.dev/" });
					f.createSpan({ text: " can be used." });
				}))
				.addText(t => {
					t.setValue(frame.icon);
					t.onChange(async v => {
						frame.icon = v;
						await this.plugin.saveSettings();
					});
				});
			new Setting(this.containerEl)
				.setName("URL")
				.setDesc("The URL that should be opened in this frame.")
				.addText(t => {
					t.setValue(frame.url);
					t.onChange(async v => {
						frame.url = v;
						await this.plugin.saveSettings();
					});
				});
			new Setting(this.containerEl)
				.setName("Disable on Mobile")
				.setDesc("Custom Frames is a lot more restricted on mobile devices and doesn't allow for the same types of content to be displayed. If a frame doesn't work as expected on mobile, it can be disabled.")
				.addToggle(t => {
					t.setValue(frame.hideOnMobile);
					t.onChange(async v => {
						frame.hideOnMobile = v;
						await this.plugin.saveSettings();
					});
				});
			new Setting(this.containerEl)
				.setName("Minimum Width")
				.setDesc(createFragment(f => {
					f.createSpan({ text: "The width that this frame's pane should be adjusted to automatically if it is lower. Set to 0 to disable." });
					f.createEl("br");
					f.createEl("em", { text: "Note that this is only applied on Desktop." });
				}))
				.addText(t => {
					t.inputEl.type = "number";
					t.setValue(String(frame.minimumWidth));
					t.onChange(async v => {
						frame.minimumWidth = v.length ? Number(v) : 0;
						await this.plugin.saveSettings();
					});
				});
			new Setting(this.containerEl)
				.setName("Additional CSS")
				.setDesc(createFragment(f => {
					f.createSpan({ text: "A snippet of additional CSS that should be applied to this frame." });
					f.createEl("br");
					f.createEl("em", { text: "Note that this is only applied on Desktop." });
				}))
				.addTextArea(t => {
					t.inputEl.rows = 5;
					t.inputEl.cols = 50;
					t.setValue(frame.customCss);
					t.onChange(async v => {
						frame.customCss = v;
						await this.plugin.saveSettings();
					});
				});

			new ButtonComponent(this.containerEl)
				.setButtonText("Remove Frame")
				.onClick(async () => {
					this.plugin.settings.frames.remove(frame);
					await this.plugin.saveSettings();
					this.display();
				});
		}

		this.containerEl.createEl("hr");
		let info = this.containerEl.createEl("p", { text: "Create a new frame, either from a preset shipped with the plugin, or a custom one that you can edit yourself. Each frame's pane can be opened using the \"Custom Frames: Open\" command." });
		info.createEl("br");
		info.createSpan({ text: "Note that Obsidian has to be restarted or reloaded to activate a newly added frame.", cls: "mod-warning" });

		let addDiv = this.containerEl.createDiv();
		addDiv.addClass("custom-frames-add");
		let dropdown = new DropdownComponent(addDiv);
		dropdown.addOption("new", "Custom");
		for (let key of Object.keys(presets))
			dropdown.addOption(key, presets[key].displayName);
		new ButtonComponent(addDiv)
			.setButtonText("Add Frame")
			.onClick(async () => {
				let option = dropdown.getValue();
				if (option == "new") {
					this.plugin.settings.frames.push({
						url: "",
						displayName: "New Frame",
						icon: "",
						minimumWidth: 0,
						customCss: "",
						hideOnMobile: true
					});
				}
				else {
					this.plugin.settings.frames.push(presets[option]);
				}
				await this.plugin.saveSettings();
				this.display();
			});

		this.containerEl.createEl("hr");
		this.containerEl.createEl("p", { text: "If you like this plugin and want to support its development, you can do so through my website by clicking this fancy image!" });
		this.containerEl.createEl("a", { href: "https://ellpeck.de/support" })
			.createEl("img", { attr: { src: "https://ellpeck.de/res/generalsupport.png" }, cls: "custom-frames-support" });
	}
}