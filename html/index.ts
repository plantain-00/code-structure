import * as Vue from "vue";
import Component from "vue-class-component";
import { EventData, TreeData, DropPosition } from "tree-component/vue";
import { JsonDataResult, JsonResult, JsonResultType } from "../src/types";

import { indexTemplateHtml } from "./variables";

declare const data: JsonDataResult[];

function jsonResultToTreeData(jsonResult: JsonResult): TreeData<Value> {
    const text = jsonResult.type === "call" ? `${jsonResult.line} ${jsonResult.text}` : `${jsonResult.file} ${jsonResult.line} ${jsonResult.text}`;
    const treeData: TreeData = {
        text,
        icon: false,
        value: {
            type: jsonResult.type,
            file: jsonResult.file,
            line: jsonResult.line,
            text: jsonResult.text,
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

@Component({
    template: indexTemplateHtml,
})
class App extends Vue {
    data = treeDatas;

    private lastSelectedNode: TreeData<Value> | null = null;

    toggle(eventData: EventData<Value>) {
        eventData.data.state.opened = !eventData.data.state.opened;
    }
    change(eventData: EventData<Value>) {
        if (this.lastSelectedNode) {
            this.lastSelectedNode.state.selected = false;
        }
        eventData.data.state.selected = true;
        this.lastSelectedNode = eventData.data;
    }
}

type Value = {
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
};

new App({ el: "#container" });
