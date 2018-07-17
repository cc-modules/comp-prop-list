const MissingRefErrMsg = 'Missing reference in comp-prop-list!\nYou may delete one or more nodes/assets that referenced in prop list component.';

const KeyValuePair = cc.Class({
  name: 'KeyValuePair',
  properties: {
    name: '',
    value: ''
  }
});

const CompPropList = cc.Class({
  name: 'PropList',
  extends: cc.Component,
  properties: {
    nodes: {
      type: cc.Node,
      default: () => []
    },
    audios: {
      url: cc.AudioClip,
      default: () => []
    },
    tags: {
      type: KeyValuePair,
      default: () => []
    }
  },
  onLoad () {
    this.init();
  },
  init () {
    const comps = this.node._components;
    for (let i in comps) {
      let comp = comps[i];
      if (!comp) continue;
      if (comp.sceneScript) {
        this.inject(this.nodes, comp);
        this.inject(this.audios, comp, generatePrefixer('audio'));
        this.inject(this.tags, comp, generatePrefixer('_$', false));
      } else if (this.node.name.match(/\$$/)) {
        this.inject(this.nodes, this.node);
        this.inject(this.tags, this.node, generatePrefixer('_$', false));
      }
    }
  },
  inject (array, comp, prefixer = identity) {
    if (!array) return;
    array.forEach(n => {
      if (!n) {
        console.warn(MissingRefErrMsg);
        return;
      }
      let name = n.name;
      let prop = comp[n.name];
      let newName = prefixer(n.name);
      if (typeof prop === 'undefined') {
        comp[newName] = n.value || n;
      } else if (Array.isArray(prop)) {
        prop.push(n.value || n);
      } else {
        comp[newName] = [comp[newName], n.value || n];
      }
    });
  }
});

CompPropList.KeyValuePair = KeyValuePair;

function identity (x) {
  return x;
}

function generatePrefixer (prefix, capitalize = true) {
  return function (name) {
    return prefix + (capitalize ? name[0].toUpperCase() + name.substr(1) : name);
  }
}