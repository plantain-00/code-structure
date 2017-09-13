import * as Vue from "vue";
import Component from "vue-class-component";
import { EventData, TreeData } from "tree-component/vue";

import { indexTemplateHtml } from "./variables";

declare const data: any;

@Component({
    template: indexTemplateHtml,
})
class App extends Vue {
    data = data;

    toggle(eventData: EventData<Value>) {
        eventData.data.state.opened = !eventData.data.state.opened;
    }
    change(eventData: EventData<Value>) {
        if (!eventData.data.state.selected) {
            for (const child of this.data) {
                clearSelectionOfTree(child);
            }
        }
        eventData.data.state.selected = !eventData.data.state.selected;
    }
}

function clearSelectionOfTree(tree: TreeData<Value>) {
    if (tree.state.selected) {
        tree.state.selected = false;
    }
    if (tree.children) {
        for (const child of tree.children) {
            clearSelectionOfTree(child);
        }
    }
}

type Value = {
    id: number;
};

new App({ el: "#container" });
