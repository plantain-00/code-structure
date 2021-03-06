(()=>{"use strict";var e={3571:(e,t,n)=>{var l,r,o=n(655),a=n(6252),i=n(9963),c=n(7306),s=n(7869),u=n(7629),d=n(3577),f=(0,a.aZ)({render:function(e,t){return(0,a.wg)(),(0,a.j4)("span",null,[(0,a.Wm)("span",{class:e.color},(0,d.zw)(e.data.value.line),3),(0,a.Uk)(" "+(0,d.zw)(e.data.value.text),1)])},props:{data:{value:Object,required:!0}},computed:{color:function(){return"line-number-"+this.data.value.type}}});function h(e,t){var n,l,r={component:"custom-node",icon:!1,value:{type:e.type,file:e.file,line:e.line,text:e.text,parent:t},state:{opened:!1,selected:!1,disabled:!1,loading:!1,highlighted:!1,openable:!1,dropPosition:0,dropAllowed:!1},children:[]};if(e.children.length>0){r.state.openable=!0;try{for(var a=(0,o.XA)(e.children),i=a.next();!i.done;i=a.next()){var c=i.value;r.children.push(h(c,r))}}catch(e){n={error:e}}finally{try{i&&!i.done&&(l=a.return)&&l.call(a)}finally{if(n)throw n.error}}}return r}var p=[],v=function(e){if(e.results.length>0){var t={text:e.file,icon:"tree-file",value:{type:"file",file:e.file,line:0,text:e.file,parent:null},state:{opened:!0,selected:!1,disabled:!1,loading:!1,highlighted:!1,openable:!0,dropPosition:0,dropAllowed:!1},children:[]};t.children=e.results.map((function(e){return h(e,t)})),p.push(t)}};try{for(var m=(0,o.XA)(data),g=m.next();!g.done;g=m.next())v(g.value)}catch(e){l={error:e}}finally{try{g&&!g.done&&(r=m.return)&&r.call(m)}finally{if(l)throw l.error}}var b=(0,a.aZ)({render:function(e,t){var n=(0,a.up)("tree");return(0,a.wg)(),(0,a.j4)("div",null,[(0,a.Wm)(n,{data:e.data,onToggle:t[1]||(t[1]=function(t){return e.toggle(t)}),onChange:t[2]||(t[2]=function(t){return e.change(t)})},null,8,["data"]),(0,a.Wm)("div",{class:"file"},(0,d.zw)(e.file),1),(0,a.Wm)("div",{ref:"lineNumber",class:"line-number"},[((0,a.wg)(!0),(0,a.j4)(a.HY,null,(0,a.Ko)(e.lineNumbers,(function(e){return(0,a.wg)(),(0,a.j4)("div",{class:e.className,key:e.lineNumber},(0,d.zw)(e.lineNumber),3)})),128))],512),(0,a.Wm)("pre",{ref:"code",innerHTML:e.selectedNodeText,onScroll:t[3]||(t[3]=function(t){return e.scroll(t)})},null,40,["innerHTML"])])},data:function(){return{data:p,selectedNodeText:"",file:"",lineNumbers:[],contentScroll:void 0,lastSelectedNode:null,codeElement:void 0}},mounted:function(){var e=this;this.codeElement=this.$refs.code,this.contentScroll=new u.ko((function(t){e.codeElement.scrollTop=t}))},methods:{toggle:function(e){e.data.state.opened=!e.data.state.opened},change:function(e){var t=this;this.lastSelectedNode&&(this.lastSelectedNode.state.selected=!1),e.data.state.selected=!0,this.lastSelectedNode=e.data,"definition"!==e.data.value.type&&"file"!==e.data.value.type||(e.data.state.opened=!0);var n=e.data.value.file,l=fullTexts[n];if((0,a.Y3)((function(){t.contentScroll&&t.codeElement&&("file"===e.data.value.type?t.contentScroll.start(t.codeElement.scrollTop,0):t.contentScroll.start(t.codeElement.scrollTop,18*e.data.value.line-11))})),this.file!==n){this.file=n;var r="";this.file.endsWith(".js")?r="js":this.file.endsWith(".ts")&&(r="ts"),this.selectedNodeText=function(e,t){if(t&&s.getLanguage(t))try{return'<code class="hljs '+t+'">'+s.highlight(t,e).value+"</code>"}catch(e){console.log(e)}else try{return'<code class="hljs">'+s.highlightAuto(e).value+"</code>"}catch(e){console.log(e)}return'<code class="hljs">'+e+"</code>"}(l,r)}for(var o=[],i=l.split("\n").length,c=function(t){if(t===e.data.value.line)o.push({lineNumber:t,className:"line-number-"+e.data.value.type});else{var n=e.data.children.find((function(e){return e.value.line===t}));n?o.push({lineNumber:t,className:"line-number-"+n.value.type}):o.push({lineNumber:t})}},u=1;u<i;u++)c(u);this.lineNumbers=o},scroll:function(){this.$refs.lineNumber.scrollTop=this.codeElement.scrollTop}}}),y=(0,i.ri)(b);y.component("tree",c.mp),y.component("node",c.NB),y.component("custom-node",f),y.mount("#container")}},t={};function n(l){if(t[l])return t[l].exports;var r=t[l]={exports:{}};return e[l](r,r.exports,n),r.exports}n.m=e,n.x=e=>{},n.d=(e,t)=>{for(var l in t)n.o(t,l)&&!n.o(e,l)&&Object.defineProperty(e,l,{enumerable:!0,get:t[l]})},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e={826:0},t=[[3571,736]],l=e=>{},r=(r,o)=>{for(var a,i,[c,s,u,d]=o,f=0,h=[];f<c.length;f++)i=c[f],n.o(e,i)&&e[i]&&h.push(e[i][0]),e[i]=0;for(a in s)n.o(s,a)&&(n.m[a]=s[a]);for(u&&u(n),r&&r(o);h.length;)h.shift()();return d&&t.push.apply(t,d),l()},o=self.webpackChunkcode_structure=self.webpackChunkcode_structure||[];function a(){for(var l,r=0;r<t.length;r++){for(var o=t[r],a=!0,i=1;i<o.length;i++){var c=o[i];0!==e[c]&&(a=!1)}a&&(t.splice(r--,1),l=n(n.s=o[0]))}return 0===t.length&&(n.x(),n.x=e=>{}),l}o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o));var i=n.x;n.x=()=>(n.x=i||(e=>{}),(l=a)())})(),n.x()})();