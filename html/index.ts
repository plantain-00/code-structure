import Vue from 'vue'
import Component from 'vue-class-component'
import { EventData, TreeData, DropPosition } from 'tree-vue-component'
import 'tree-vue-component'
import * as hljs from 'highlight.js'
import { EaseInOut } from 'ease-in-out'
import { JsonDataResult, JsonResult, JsonResultType } from '../src/types'

import { indexTemplateHtml, indexTemplateHtmlStatic, nodeTemplateHtml, nodeTemplateHtmlStatic } from './variables'

@Component({
  render: nodeTemplateHtml,
  staticRenderFns: nodeTemplateHtmlStatic,
  props: ['data']
})
export class CustomNode extends Vue {
  data!: TreeData<Value>

  get color() {
    return `line-number-${this.data.value!.type}`
  }
}
Vue.component('custom-node', CustomNode)

declare const data: JsonDataResult[]
declare const fullTexts: { [file: string]: string }

function jsonResultToTreeData(jsonResult: JsonResult, parent: TreeData<Value>): TreeData<Value> {
  const treeData: TreeData<Value> = {
    component: 'custom-node',
    icon: false,
    value: {
      type: jsonResult.type,
      file: jsonResult.file,
      line: jsonResult.line,
      text: jsonResult.text,
      parent
    },
    state: {
      opened: false,
      selected: false,
      disabled: false,
      loading: false,
      highlighted: false,
      openable: false,
      dropPosition: DropPosition.empty,
      dropAllowed: false
    },
    children: []
  }
  if (jsonResult.children.length > 0) {
    treeData.state.openable = true
    for (const child of jsonResult.children) {
      treeData.children.push(jsonResultToTreeData(child, treeData))
    }
  }
  return treeData
}

const treeDatas: TreeData<Value>[] = []
for (const d of data) {
  if (d.results.length > 0) {
    const treeData: TreeData<Value> = {
      text: d.file,
      icon: 'tree-file',
      value: {
        type: JsonResultType.file,
        file: d.file,
        line: 0,
        text: d.file,
        parent: null
      },
      state: {
        opened: true,
        selected: false,
        disabled: false,
        loading: false,
        highlighted: false,
        openable: true,
        dropPosition: DropPosition.empty,
        dropAllowed: false
      },
      children: []
    }
    treeData.children = d.results.map(r => jsonResultToTreeData(r, treeData))
    treeDatas.push(treeData)
  }
}

function highlight(str: string, lang: string) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<code class="hljs ${lang}">${hljs.highlight(lang, str).value}</code>`
    } catch (error) {
      console.log(error)
    }
  } else {
    try {
      return `<code class="hljs">${hljs.highlightAuto(str).value}</code>`
    } catch (error) {
      console.log(error)
    }
  }
  return `<code class="hljs">${str}</code>`
}

@Component({
  render: indexTemplateHtml,
  staticRenderFns: indexTemplateHtmlStatic
})
export class App extends Vue {
  data = treeDatas
  selectedNodeText = ''
  file = ''
  lineNumbers: LineNumber[] = []

  private contentScroll!: EaseInOut
  private lastSelectedNode: TreeData<Value> | null = null
  private codeElement!: HTMLElement

  mounted() {
    this.codeElement = this.$refs.code as HTMLElement
    this.contentScroll = new EaseInOut(currentValue => {
      this.codeElement!.scrollTop = currentValue
    })
  }

  toggle(eventData: EventData<Value>) {
    eventData.data.state.opened = !eventData.data.state.opened
  }
  change(eventData: EventData<Value>) {
    if (this.lastSelectedNode) {
      this.lastSelectedNode.state.selected = false
    }
    eventData.data.state.selected = true
    this.lastSelectedNode = eventData.data

    if (eventData.data.value!.type === JsonResultType.definition
      || eventData.data.value!.type === JsonResultType.file) {
      eventData.data.state.opened = true
    }

    const currentFile = eventData.data.value!.file
    const fullText = fullTexts[currentFile]

    Vue.nextTick(() => {
      if (eventData.data.value!.type === JsonResultType.file) {
        this.contentScroll.start(this.codeElement.scrollTop, 0)
      } else {
        this.contentScroll.start(this.codeElement.scrollTop, eventData.data.value!.line * 18 - 11)
      }
    })

    if (this.file !== currentFile) {
      this.file = currentFile

      let lang = ''
      if (this.file.endsWith('.js')) {
        lang = 'js'
      } else if (this.file.endsWith('.ts')) {
        lang = 'ts'
      }
      this.selectedNodeText = highlight(fullText, lang)
    }

    const lineNumbers: LineNumber[] = []
    const totalLineNumber = fullText.split('\n').length
    for (let i = 1; i < totalLineNumber; i++) {
      if (i === eventData.data.value!.line) {
        lineNumbers.push({ lineNumber: i, className: `line-number-${eventData.data.value!.type}` })
      } else {
        const child = eventData.data.children.find(c => c.value!.line === i)
        if (child) {
          lineNumbers.push({ lineNumber: i, className: `line-number-${child.value!.type}` })
        } else {
          lineNumbers.push({ lineNumber: i })
        }
      }
    }
    this.lineNumbers = lineNumbers
  }
  scroll(e: UIEvent) {
    (this.$refs.lineNumber as HTMLElement).scrollTop = this.codeElement!.scrollTop
  }
}

interface Value {
  type: JsonResultType;
  file: string;
  line: number;
  text: string;
  parent: TreeData<Value> | null;
}

interface LineNumber {
  lineNumber: number;
  className?: string;
}

new App({ el: '#container' })
