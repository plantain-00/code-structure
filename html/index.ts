import * as Vue from "vue";
import Component from "vue-class-component";
import { EventData, TreeData, DropPosition } from "tree-component/vue";
import * as hljs from "highlight.js";
import EaseInOut from "ease-in-out";
import { JsonDataResult, JsonResult, JsonResultType } from "../src/types";

import { indexTemplateHtml } from "./variables";

@Component({
    template: `<span><span :class="color">{{data.value.line}}</span> {{data.value.text}}</span>`,
    props: ["data"],
})
class CustomNode extends Vue {
    data: TreeData<Value>;

    get color() {
        return `line-number-${this.data.value!.type}`;
    }
}
Vue.component("custom-node", CustomNode);

declare const data: JsonDataResult[];
declare const fullTexts: string[];

function jsonResultToTreeData(jsonResult: JsonResult, parent: TreeData<Value>): TreeData<Value> {
    const treeData: TreeData<Value> = {
        component: "custom-node",
        icon: false,
        value: {
            type: jsonResult.type,
            file: jsonResult.file,
            line: jsonResult.line,
            text: jsonResult.text,
            fullText: jsonResult.fullTextIndex === undefined ? "" : fullTexts[jsonResult.fullTextIndex],
            parent,
        },
        state: {
            opened: false,
            selected: false,
            disabled: false,
            loading: false,
            highlighted: false,
            openable: false,
            dropPosition: DropPosition.empty,
            dropAllowed: false,
        },
        children: [],
    };
    if (jsonResult.children.length > 0) {
        treeData.state.openable = true;
        for (const child of jsonResult.children) {
            treeData.children.push(jsonResultToTreeData(child, treeData));
        }
    }
    return treeData;
}

const treeDatas: TreeData<Value>[] = [];
for (const d of data) {
    const treeData: TreeData<Value> = {
        text: d.file,
        icon: "tree-file",
        value: {
            type: JsonResultType.file,
            file: d.file,
            line: 0,
            text: d.file,
            fullText: fullTexts[d.fullTextIndex],
            parent: null,
        },
        state: {
            opened: true,
            selected: false,
            disabled: false,
            loading: false,
            highlighted: false,
            openable: true,
            dropPosition: DropPosition.empty,
            dropAllowed: false,
        },
        children: [],
    };
    treeData.children = d.results.map(r => jsonResultToTreeData(r, treeData));
    treeDatas.push(treeData);
}

function highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
        try {
            return `<code class="hljs ${lang}">${hljs.highlight(lang, str).value}</code>`;
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.log(error);
        }
    } else {
        try {
            return `<code class="hljs">${hljs.highlightAuto(str).value}</code>`;
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.log(error);
        }
    }
    return `<code class="hljs">${str}</code>`;
}

@Component({
    template: indexTemplateHtml,
})
class App extends Vue {
    data = treeDatas;
    selectedNodeText = "";
    file = "";
    lineNumbers: LineNumber[] = [];

    private contentScroll: EaseInOut;
    private lastSelectedNode: TreeData<Value> | null = null;
    private codeElement: HTMLElement;
    private lastNode: TreeData<Value> | null = null;

    mounted() {
        this.codeElement = this.$refs.code as HTMLElement;
        this.contentScroll = new EaseInOut(currentValue => {
            this.codeElement.scrollTop = currentValue;
        });
    }

    toggle(eventData: EventData<Value>) {
        eventData.data.state.opened = !eventData.data.state.opened;
    }
    change(eventData: EventData<Value>) {
        if (this.lastSelectedNode) {
            this.lastSelectedNode.state.selected = false;
        }
        eventData.data.state.selected = true;
        this.lastSelectedNode = eventData.data;
        let currentNode = eventData.data;
        if (eventData.data.value!.type === JsonResultType.definition) {
            eventData.data.state.opened = true;
            currentNode = treeDatas.find(t => t.value!.file === eventData.data.value!.file)!;
            Vue.nextTick(() => {
                this.contentScroll.start(this.codeElement.scrollTop, eventData.data.value!.line * 18 + 7);
            });
        } else if (eventData.data.value!.type === JsonResultType.file) {
            eventData.data.state.opened = true;
            Vue.nextTick(() => {
                this.contentScroll.start(this.codeElement.scrollTop, 0);
            });
        } else if (eventData.data.value!.type === JsonResultType.call) {
            currentNode = treeDatas.find(t => t.value!.file === eventData.data.value!.file)!;
            Vue.nextTick(() => {
                this.contentScroll.start(this.codeElement.scrollTop, eventData.data.value!.line * 18 + 7);
            });
        } else {
            Vue.nextTick(() => {
                this.contentScroll.start(this.codeElement.scrollTop, 0);
            });
        }

        if (this.lastNode === currentNode) {
            return;
        }
        this.lastNode = currentNode;

        let lang = "";
        if (currentNode.value!.file.endsWith(".js")) {
            lang = "js";
        } else if (currentNode.value!.file.endsWith(".ts")) {
            lang = "ts";
        }
        this.selectedNodeText = highlight(currentNode.value!.fullText, lang);
        this.file = currentNode.value!.file;
        const lineNumbers: LineNumber[] = [];
        const totalLineNumber = currentNode.value!.fullText.split("\n").length;
        for (let i = 0; i < totalLineNumber; i++) {
            const lineNumber = i + currentNode.value!.line;
            if (i === 0) {
                lineNumbers.push({ lineNumber, className: `line-number-${currentNode.value!.type}` });
            } else {
                const child = currentNode.children.find(c => c.value!.line === lineNumber);
                if (child) {
                    lineNumbers.push({ lineNumber, className: `line-number-${child.value!.type}` });
                } else {
                    lineNumbers.push({ lineNumber });
                }
            }
        }
        this.lineNumbers = lineNumbers;
    }
    scroll(e: UIEvent) {
        (this.$refs.lineNumber as HTMLElement).scrollTop = this.codeElement.scrollTop;
    }
}

type Value = {
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
    fullText: string;
    parent: TreeData<Value> | null;
};

type LineNumber = {
    lineNumber: number;
    className?: string;
};

new App({ el: "#container" });
