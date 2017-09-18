export const indexTemplateHtml = `<div><tree :data="data" @toggle="toggle($event)" @change="change($event)"></tree><pre v-html="selectedNodeText"></pre></div>`;
