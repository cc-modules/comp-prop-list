const pluralize = require('pluralize');
const TAG = '[PropList]';
const MissingRefErrMsg = 'Missing reference in comp-prop-list!\nYou may delete one or more nodes/assets that referenced in prop list component.';

const propType2ccType = {
  nodes: 'T',
  audios: 'cc.AudioClip',
  tags: '',
  nodeComps: ''
};

const KeyValuePair = cc.Class({
  name: 'KeyValuePair',
  properties: {
    name: '',
    value: ''
  }
});

const NamedNode = cc.Class({
  name: 'NamedNode',
  properties: {
    node: cc.Node,
    name: ''
  }
});

const NamedAudioClip = cc.Class({
  name: 'NamedAudioClip',
  properties: {
    audioClip: {
      type: cc.AudioClip,
      default: null
    },
    name: ''
  }
});

const NodeComp = cc.Class({
  name: 'NodeComp',
  properties: {
    nodeName: '',
    component: '',
    name: ''
  }
})

const CompPropList = cc.Class({
  name: 'PropList',
  extends: cc.Component,
  editor: {
    executeInEditMode: true
  },
  properties: {
    generateFile: false,
    filename: 'Main-prop-list.ts',
    baseClass: 'GameBase',
    nodes: {
      type: NamedNode,
      default: () => []
    },
    audios: {
      type: NamedAudioClip,
      default: () => []
    },
    nodeComps: {
      type: NodeComp,
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
    const comp = comps.find(it => it.sceneScript);
    if (comp) {
      this.inject(this.nodes, comp);
      this.inject(this.audios, comp, generatePrefixer('_$audio'));
      this.inject(this.tags, comp);
      this.inject(this.nodeComps, comp, generatePrefixer('_$', false));
    } else {
      this.inject(this.nodes, this.node);
      this.inject(this.audios, this.node, generatePrefixer('_$audio'));
      this.inject(this.tags, this.node);
      this.inject(this.nodeComps, this.node, generatePrefixer('_$', false));
    };
  },
  start() {
    const comps = this.node._components;
    const comp = comps.find(it => it.sceneScript);
    if (CC_EDITOR) {
      this.__injected = [];
    }
    if (comp) {
      this.pluralize('nodes', this.nodes, comp);
      this.pluralize('audios', this.audios, comp, generatePrefixer('_$audio'));
      this.pluralize('tags', this.tags, comp);
      this.pluralize('nodeComps', this.nodeComps, comp, generatePrefixer('_$', false));
    } else {
      this.pluralize('nodes', this.nodes, this.node);
      this.pluralize('audios', this.audios, this.node, generatePrefixer('_$audio'));
      this.pluralize('tags', this.tags, this.node);
      this.pluralize('nodeComps', this.nodeComps, this.node, generatePrefixer('_$', false));
    };
    if (CC_EDITOR && this.generateFile) {
      this.saveFile();
    }
  },
  pluralize(type, array, compOrNode, prefixer = identity) {
    if (!array || !array.length) return;
    const injected = [];
    array.forEach(n => {
      if (!n) return;
      let newName, val;
      if (n.node) {
        newName = n.name || prefixer(n.node.name);
      } else if (n.audioClip) {
        newName = n.name || prefixer(n.audioClip.name);
      } else if (!isUndefiend(n.nodeName)) {
        newName = n.name;
      } else {
        newName = prefixer(n.name);
      }
      const pluralized = pluralize(newName);
      if (Array.isArray(compOrNode[newName])) {
        val = compOrNode[pluralized] = compOrNode[newName];
        delete compOrNode[newName];
        newName = pluralized;
        injected.push(newName);
      } else {
        val = compOrNode[newName];
        if (Array.isArray(compOrNode[pluralized])) {
          val = compOrNode[pluralized];
        } else {
          injected.push(newName);
        }
      }
    });
    if (CC_DEBUG) {
      injected.forEach(newName => {
        const val = compOrNode[newName]
        if (CC_DEBUG) console.log(`${TAG} ${compOrNode.name}.${newName} = `, val);
        if (CC_EDITOR) this.__injected.push([newName, getTypeOf(type, val)]);
      });
    }
  },
  inject (array, compOrNode, prefixer = identity) {
    if (!array || !array.length) return;
    array.forEach(n => {
      if (!n) {
        console.warn(MissingRefErrMsg);
        return;
      }
      let prop, newName, value;
      if (n.node) {
        newName = n.name || prefixer(n.node.name);
      } else if (n.audioClip) {
        newName = n.name || prefixer(n.audioClip.name);
      } else if (!isUndefiend(n.nodeName)) {
        newName = n.name;
      } else {
        newName = prefixer(n.name);
      }
      n = n.node || n.audioClip || n;
      // Existing prop with newName(array of item with same name)
      prop = compOrNode[newName];
      if (n.component) {
        // nodeComps
        if (!isUndefiend(n.nodeName) && !isUndefiend(n.name) /* && isUndefiend(n.component) */) {
          let node = compOrNode[n.nodeName] || compOrNode;
          let com = node.getComponent(n.component);
          if (!newName) newName = lowerFirst(com.constructor.name);
          if (!com) return;
          value = com;
        }
      } else if (n.value) {
        value = convert(n.value);
      } else {
        value = n;
      }

      // merge values with the same name into an array
      let val;
      if (isUndefiend(prop)) {
        val = compOrNode[newName] = value;
      } else if (Array.isArray(prop)) {
        prop.push(value);
        val = prop;
      } else {
        compOrNode[newName] = [compOrNode[newName], value];
      }
    });
  },
  getTagsAsObject (){
    const sceneScript = this.node._components.find(c => c.sceneScript);
    if (!sceneScript) throw new Error(`No scene script on node ${this.node.name}`);
    return this.tags.reduce((all, it) => {
      const key = `_$${it.name}`;
      all[key] = sceneScript[key];
      return all;
    }, {});
  },
  writeTagsFromObject (state) {
    const sceneScript = this.node._components.find(c => c.sceneScript);
    if (!sceneScript) throw new Error(`No scene script on node ${this.node.name}`);
    Object.assign(sceneScript, state);
  },
  saveFile() {
    const filename = this.filename;
    const injected = this.__injected;
    const path = Editor.url(`db://assets/scripts/${filename}`);

    const fs = require('fs');
    let code = [
      `export default class<T = cc.Node>${this.baseClass ? (' extends ' + this.baseClass) : ''} {`,
      `  sceneScript = true;`,
      `  constructor() {`,
      `    ${this.baseClass ? 'super();' : ''}`,
      `  }`
    ]
    code = code.concat(injected.map(it =>`  ${it[0]}${it[1]};`));
    code.push('}');
    Editor.log(`${filename} saved!`);
    let imports;
    if (fs.existsSync(path)) {
      imports = fs.readFileSync(path).toString().split('\n').filter(line => {
        line = line.trim();
        return line.indexOf('import') === 0 || line.indexOf('require') === 0;
      });
    }
    fs.writeFileSync(path, [
      '// You need to import neccessary modules manually below',
      imports ? imports.join('\n') : '',
      '\n//<AutoGenerated>',
      '// DO NOT EDIT!!!',
      code.join('\n'),
      '//</AutoGenerated>'
    ].join('\n'));
  }
});

function getTypeOf(type, val) {
  const t = propType2ccType[type];
  if (t) {
    return `: ${t}${Array.isArray(val) ? '[]' : ''}`;
  } else {
    // value
    let t;
    if (val instanceof cc.Component) {
      t = cc.js.getClassName(val);
      if (typeof t === 'function') t = t.name;
      return `: ${t}`;
    } else {
      t = convert(val);
    }
    return ` = ${Array.isArray(val) ? JSON.stringify(val) : t}`;
  }
}

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

function isUndefiend(a) {
  return typeof a === 'undefined';
}

function lowerFirst(str) {
  return str[0].toLowerCase() + str.slice(1);
}

function generatePrefixer (prefix, capitalize = true) {
  return function (name) {
    return prefix + (capitalize ? name[0].toUpperCase() + name.substr(1) : name);
  }
}