export const indexTemplateHtml = `<div><tree :data="data" @toggle="toggle($event)" @change="change($event)"></tree><pre>{{selectedNodeText}}</pre></div>`;
