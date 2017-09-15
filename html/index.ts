import * as Vue from "vue";
import Component from "vue-class-component";
import { EventData, TreeData, DropPosition } from "tree-component/vue";
import { JsonDataResult, JsonResult, JsonResultType } from "../src/types";

import { indexTemplateHtml } from "./variables";

@Component({
    template: `<span><span :style="color"><template v-if="showFile">{{data.value.file}} </template>{{data.value.line}}</span> {{data.value.text}}</span>`,
    props: ["data"],
})
class CustomNode extends Vue {
    data: TreeData<Value>;

    get showFile() {
        return this.data.value!.type !== JsonResultType.call;
    }
    get color() {
        if (this.data.value!.type === JsonResultType.call) {
            return { color: "red" };
        } else if (this.data.value!.type === JsonResultType.definition) {
            return { color: "green" };
        }
        return { color: "blue" };
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

@Component({
    template: indexTemplateHtml,
})
class App extends Vue {
    data = treeDatas;
    selectedNodeText = "";

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
        this.selectedNodeText = eventData.data.value!.fullText;
    }
}

type Value = {
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
    fullText: string;
};

new App({ el: "#container" });
