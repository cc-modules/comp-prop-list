const MissingRefErrMsg = 'Missing reference in comp-prop-list!\nYou may delete one or more nodes/assets that referenced in prop list component.';
cc.Class({
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
    }
  },
  onLoad () {
    this.init();
  },
  init () {
    const comps = this.node._components;
    for (let i in comps) {
      let comp = comps[i];
      if (!comp || comp.sceneScript !== true) continue;
      this.inject(this.nodes, comp);
      this.inject(this.audios, comp, generatePrefixer('audio'))
    }
  },
  inject (array, comp, prefixer = identity) {
    array.forEach(n => {
      if (!n) {
        console.warn(MissingRefErrMsg);
        return;
      }
      let name = n.name;
      let prop = comp[n.name];
      let newName = prefixer(n.name);
      if (typeof prop === 'undefined') {
        comp[newName] = n;
      } else if (Array.isArray(prop)) {
        prop.push(n);
      } else {
        comp[newName] = [comp[newName], n];
      }
    });
  }
});

function identity (x) {
  return x;
}

function generatePrefixer (prefix) {
  return function (name) {
    return prefix + name[0].toUpperCase() + name.substr(1);
  }
}