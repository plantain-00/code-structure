import * as Vue from "vue";
import Component from "vue-class-component";
import { EventData, TreeData, DropPosition } from "tree-component/vue";
import * as hljs from "highlight.js";
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

function jsonResultToTreeData(jsonResult: JsonResult): TreeData<Value> {
    const treeData: TreeData = {
        component: "custom-node",
        icon: false,
        value: {
            type: jsonResult.type,
            file: jsonResult.file,
            line: jsonResult.line,
            text: jsonResult.text,
            fullText: fullTexts[jsonResult.fullTextIndex],
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
            treeData.children.push(jsonResultToTreeData(child));
        }
    }
    return treeData;
}

const treeDatas: TreeData<Value>[] = [];
for (const d of data) {
    treeDatas.push({
        text: d.file,
        icon: "tree-file",
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
        children: d.results.map(r => jsonResultToTreeData(r)),
    });
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

    private lastSelectedNode: TreeData<Value> | null = null;

    toggle(eventData: EventData<Value>) {
        eventData.data.state.opened = !eventData.data.state.opened;
    }
    change(eventData: EventData<Value>) {
        if (this.lastSelectedNode) {
            this.lastSelectedNode.state.selected = false;
        }
        eventData.data.state.selected = true;
        eventData.data.state.opened = true;
        this.lastSelectedNode = eventData.data;
        if (eventData.data.value) {
            let lang = "";
            if (eventData.data.value.file.endsWith(".js")) {
                lang = "js";
            } else if (eventData.data.value.file.endsWith(".ts")) {
                lang = "ts";
            }
            this.selectedNodeText = highlight(eventData.data.value.fullText, lang);
            this.file = eventData.data.value.file;
            const lineNumbers: LineNumber[] = [];
            const totalLineNumber = eventData.data.value.fullText.split("\n").length;
            for (let i = 0; i < totalLineNumber; i++) {
                const lineNumber = i + eventData.data.value.line;
                if (i === 0) {
                    lineNumbers.push({ lineNumber, className: `line-number-${eventData.data.value.type}` });
                } else {
                    const child = eventData.data.children.find(c => c.value!.line === lineNumber);
                    if (child) {
                        lineNumbers.push({ lineNumber, className: `line-number-${child.value!.type}` });
                    } else {
                        lineNumbers.push({ lineNumber });
                    }
                }
            }
            this.lineNumbers = lineNumbers;
        } else {
            this.selectedNodeText = `<code class="hljs"></code>`;
            this.file = eventData.data.text || "";
        }
    }
    scroll(e: UIEvent) {
        (this.$refs.lineNumber as HTMLElement).scrollTop = (this.$refs.code as HTMLElement).scrollTop;
    }
}

type Value = {
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
    fullText: string;
};

type LineNumber = {
    lineNumber: number;
    className?: string;
};

new App({ el: "#container" });
