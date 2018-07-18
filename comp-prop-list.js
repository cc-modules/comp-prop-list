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
      let name, prop, newName, value;
      if (typeof n === 'string') {
        let seg = n.split(/[/\.]/);
        name = seg[seg.length - 2]
        newName = prefixer(name);
        prop = comp[newName];
        value = n;
      } else {
        name = n.name;
        newName = prefixer(name);
        prop = comp[newName];
        value = 'value' in n ? convert(n.value) : n;
      }

      if (typeof prop === 'undefined') {
        comp[newName] = value;
      } else if (Array.isArray(prop)) {
        prop.push(value);
      } else {
        comp[newName] = [comp[newName], value];
      }
    });
  }
});

CompPropList.KeyValuePair = KeyValuePair;

const TrueLit = 'true';
const FalseLit = 'false';
const NullLit = 'null';
const UndefinedLit = 'undefined';
const InfinityLit = 'Infinity';
const NaNLit = 'NaN';
const reSignedInteger = /^[-+]?\d$/;
const reSignedFloag = /^[+-]?\d+(\.\d+)?$/;
function convert (val) {
  if (val === TrueLit) {
    return true;
  } else if (val === FalseLit) {
    return false;
  } else if (val === NullLit) {
    return null;
  } else if (val === UndefinedLit) {
    return undefined;
  } else if (val === InfinityLit) {
    return Infinity;
  } else if (val === NaNLit) {
    return NaN;
  } else if (reSignedInteger.test(val)) {
    return parseInt(val, 10);
  } else if (reSignedFloag.test(val)) {
    return parseFloat(val);
  } else {
    return val;
  }
}

function identity (x) {
  return x;
}

function generatePrefixer (prefix, capitalize = true) {
  return function (name) {
    return prefix + (capitalize ? name[0].toUpperCase() + name.substr(1) : name);
  }
}