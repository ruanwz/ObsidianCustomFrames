import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import { CustomFrame } from "./frame";
import { CustomFrameSettings, CustomFramesSettings, getIcon } from "./settings";

export class CustomFrameView extends ItemView {

    private static readonly actions: Action[] = [
        {
            name: "Return to original page",
            icon: "home",
            action: v => v.frame.return()
        }, {
            name: "Open dev tools",
            icon: "binary",
            action: v => v.frame.toggleDevTools()
        }, {
            name: "Copy link",
            icon: "link",
            action: v => v.frame.copyLink()
        }, {
            name: "Refresh",
            icon: "refresh-cw",
            action: v => v.frame.refresh()
        }, {
            name: "Go back",
            icon: "arrow-left",
            action: v => v.frame.goBack()
        }, {
            name: "Go forward",
            icon: "arrow-right",
            action: v => v.frame.goForward()
        }
    ];

    private readonly data: CustomFrameSettings;
    private readonly name: string;
    private frame: CustomFrame;

    constructor(leaf: WorkspaceLeaf, settings: CustomFramesSettings, data: CustomFrameSettings, name: string) {
        super(leaf);
        this.data = data;
        this.name = name;
        this.frame = new CustomFrame(settings, data);

        for (let action of CustomFrameView.actions)
            this.addAction(action.icon, action.name, () => action.action(this));
    }

    onload(): void {
        this.contentEl.empty();
        this.contentEl.addClass("custom-frames-view");
        this.contentEl.appendChild(this.frame.create());
    }

    onHeaderMenu(menu: Menu): void {
        super.onHeaderMenu(menu);
        for (let action of CustomFrameView.actions) {
            menu.addItem(i => {
                i.setTitle(action.name);
                i.setIcon(action.icon);
                i.onClick(() => action.action(this));
            });
        }
    }

    getViewType(): string {
        return this.name;
    }

    getDisplayText(): string {
        return this.data.displayName;
    }

    getIcon(): string {
        return getIcon(this.data);
    }
}

interface Action {
    name: string;
    icon: string;
    action: (view: CustomFrameView) => any;
}