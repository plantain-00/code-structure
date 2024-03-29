// @ts-nocheck
/**
 * This file is generated by 'file2variable-cli'
 * It is not mean to be edited by hand
 */
import { createElementBlock as _createElementBlock, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, createVNode as _createVNode, Fragment as _Fragment, normalizeClass as _normalizeClass, openBlock as _openBlock, renderList as _renderList, resolveComponent as _resolveComponent, toDisplayString as _toDisplayString } from 'vue'
// tslint:disable
/* eslint-disable */

export function indexTemplateHtml(_ctx, _cache) {
  const _component_tree = _resolveComponent("tree")

  return (_openBlock(), _createElementBlock("div", null, [
    _createVNode(_component_tree, {
      data: _ctx.data,
      onToggle: _cache[0] || (_cache[0] = $event => (_ctx.toggle($event))),
      onChange: _cache[1] || (_cache[1] = $event => (_ctx.change($event)))
    }, null, 8 /* PROPS */, ["data"]),
    _createElementVNode("div", { class: "file" }, _toDisplayString(_ctx.file), 1 /* TEXT */),
    _createElementVNode("div", {
      ref: "lineNumber",
      class: "line-number"
    }, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.lineNumbers, (lineNumber) => {
        return (_openBlock(), _createElementBlock("div", {
          class: _normalizeClass(lineNumber.className),
          key: lineNumber.lineNumber
        }, _toDisplayString(lineNumber.lineNumber), 3 /* TEXT, CLASS */))
      }), 128 /* KEYED_FRAGMENT */))
    ], 512 /* NEED_PATCH */),
    _createElementVNode("pre", {
      ref: "code",
      innerHTML: _ctx.selectedNodeText,
      onScroll: _cache[2] || (_cache[2] = $event => (_ctx.scroll($event)))
    }, null, 40 /* PROPS, HYDRATE_EVENTS */, ["innerHTML"])
  ]))
}
export function nodeTemplateHtml(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("span", null, [
    _createElementVNode("span", {
      class: _normalizeClass(_ctx.color)
    }, _toDisplayString(_ctx.data.value.line), 3 /* TEXT, CLASS */),
    _createTextVNode(" " + _toDisplayString(_ctx.data.value.text), 1 /* TEXT */)
  ]))
}
/* eslint-enable */
// tslint:enable
