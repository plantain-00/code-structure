webpackJsonp([0],{4:function(e,t,n){"use strict";function a(e){var t={component:"custom-node",icon:!1,value:{type:e.type,file:e.file,line:e.line,text:e.text},state:{opened:!1,selected:!1,disabled:!1,loading:!1,highlighted:!1,openable:!1,dropPosition:0,dropAllowed:!1},children:[]};if(e.children.length>0){t.state.openable=!0;for(var n=0,l=e.children;n<l.length;n++){var o=l[n];t.children.push(a(o))}}return t}Object.defineProperty(t,"__esModule",{value:!0});var l=n(1),o=n(0),i=(n.n(o),n(2)),r=n.n(i),d=n(6),c=function(e){function t(){return null!==e&&e.apply(this,arguments)||this}return l.c(t,e),Object.defineProperty(t.prototype,"showFile",{get:function(){return"call"!==this.data.value.type},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"color",{get:function(){return"call"===this.data.value.type?{color:"red"}:"definition"===this.data.value.type?{color:"green"}:{color:"blue"}},enumerable:!0,configurable:!0}),t=l.b([r()({template:'<span><span :style="color"><template v-if="showFile">{{data.value.file}} </template>{{data.value.line}}</span> {{data.value.text}}</span>',props:["data"]})],t)}(o);o.component("custom-node",c);for(var s=[],p=0,u=data;p<u.length;p++){var h=u[p];s.push({text:h.file,icon:"tree-file",state:{opened:!0,selected:!1,disabled:!1,loading:!1,highlighted:!1,openable:!0,dropPosition:0,dropAllowed:!1},children:h.results.map(function(e){return a(e)})})}new(function(e){function t(){var t=null!==e&&e.apply(this,arguments)||this;return t.data=s,t.lastSelectedNode=null,t}return l.c(t,e),t.prototype.toggle=function(e){e.data.state.opened=!e.data.state.opened},t.prototype.change=function(e){this.lastSelectedNode&&(this.lastSelectedNode.state.selected=!1),e.data.state.selected=!0,this.lastSelectedNode=e.data},t=l.b([r()({template:d.a})],t)}(o))({el:"#container"})},6:function(e,t,n){"use strict";n.d(t,"a",function(){return a});var a='<div><tree :data="data" @toggle="toggle($event)" @change="change($event)"></tree></div>'}},[4]);