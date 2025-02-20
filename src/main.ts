import { Plugin, Platform } from "obsidian";
import { CustomFrame } from "./frame";
import { CustomFramesSettings, defaultSettings, getIcon } from "./settings";
import { CustomFramesSettingTab } from "./settings-tab";
import { CustomFrameView } from "./view";

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
					callback: () => this.openLeaf(name, frame.openInCenter),
				});

				if (frame.addRibbonIcon)
					this.addRibbonIcon(getIcon(frame), `Open ${frame.displayName}`, () => this.openLeaf(name, frame.openInCenter));
			} catch {
				console.error(`Couldn't register frame ${name}, is there already one with the same name?`);
			}
		}

		this.addSettingTab(new CustomFramesSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("custom-frames", (s, e) => {
			e.empty();
			e.addClass("custom-frames-view-file");

			let frameMatch = /frame:([^\n]+)/gi.exec(s);
			let frameName = frameMatch && frameMatch[1].trim();
			if (!frameName) {
				e.createSpan({ text: "Couldn't parse frame name" });
				return;
			}
			let data = this.settings.frames.find(f => f.displayName == frameName);
			if (!data) {
				e.createSpan({ text: `Couldn't find a frame with name ${frameName}` });
				return;
			}
			if (Platform.isMobileApp && data.hideOnMobile) {
				e.createSpan({ text: `${frameName} is hidden on mobile` });
				return;
			}

			let styleMatch = /style:([^\n]+)/gi.exec(s);
			let style = styleMatch && styleMatch[1].trim();
			style ||= "height: 600px;";

			let additionalUrlMatch = /additionalStyle:([^\n]+)/gi.exec(s);
			let additionalUrl = additionalUrlMatch && additionalUrlMatch[1].trim();
			additionalUrl ||= "";

			let frame = new CustomFrame(this.settings, data);
			e.appendChild(frame.create(style, additionalUrl));
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, defaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async openLeaf(name: string, center: boolean): Promise<void> {
		if (center) {
			this.app.workspace.detachLeavesOfType(name);
			await this.app.workspace.getUnpinnedLeaf().setViewState({ type: name });
		}
		else {
			if (!this.app.workspace.getLeavesOfType(name).length)
				await this.app.workspace.getRightLeaf(false).setViewState({ type: name });
		}
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(name)[0]);
	}
}