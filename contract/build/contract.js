function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

function call(target, key, descriptor) {}
function view(target, key, descriptor) {}
function NearBindgen(target) {
  return class extends target {
    static _init() {
      // @ts-ignore
      let args = target.deserializeArgs();
      let ret = new target(args); // @ts-ignore

      ret.init(); // @ts-ignore

      ret.serialize();
      return ret;
    }

    static _get() {
      let ret = Object.create(target.prototype);
      return ret;
    }

  };
}

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
function sha256(value) {
  env.sha256(value, 0);
  return env.read_register(0);
}
function storageRead(key) {
  let ret = env.storage_read(key, 0);

  if (ret === 1n) {
    return env.read_register(0);
  } else {
    return null;
  }
}
function storageGetEvicted() {
  return env.read_register(EVICTED_REGISTER);
}
function input() {
  env.input(0);
  return env.read_register(0);
}
var PromiseResult;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));
function storageWrite(key, value) {
  let exist = env.storage_write(key, value, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageRemove(key) {
  let exist = env.storage_remove(key, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}

class NearContract {
  deserialize() {
    const rawState = storageRead("STATE");

    if (rawState) {
      const state = JSON.parse(rawState); // reconstruction of the contract class object from plain object

      let c = this.default();
      Object.assign(this, state);

      for (const item in c) {
        if (c[item].constructor?.deserialize !== undefined) {
          this[item] = c[item].constructor.deserialize(this[item]);
        }
      }
    } else {
      throw new Error("Contract state is empty");
    }
  }

  serialize() {
    storageWrite("STATE", JSON.stringify(this));
  }

  static deserializeArgs() {
    let args = input();
    return JSON.parse(args || "{}");
  }

  static serializeReturn(ret) {
    return JSON.stringify(ret);
  }

  init() {}

}

function u8ArrayToBytes(array) {
  let ret = "";

  for (let e of array) {
    ret += String.fromCharCode(e);
  }

  return ret;
} // TODO this function is a bit broken and the type can't be string
// TODO for more info: https://github.com/near/near-sdk-js/issues/78

function bytesToU8Array(bytes) {
  let ret = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i++) {
    ret[i] = bytes.charCodeAt(i);
  }

  return ret;
}

const ERR_INDEX_OUT_OF_BOUNDS = "Index out of bounds";
const ERR_INCONSISTENT_STATE$1 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";

function indexToKey(prefix, index) {
  let data = new Uint32Array([index]);
  let array = new Uint8Array(data.buffer);
  let key = u8ArrayToBytes(array);
  return prefix + key;
} /// An iterable implementation of vector that stores its content on the trie.
/// Uses the following map: index -> element


class Vector {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
  }

  len() {
    return this.length;
  }

  isEmpty() {
    return this.length == 0;
  }

  get(index) {
    if (index >= this.length) {
      return null;
    }

    let storageKey = indexToKey(this.prefix, index);
    return JSON.parse(storageRead(storageKey));
  } /// Removes an element from the vector and returns it in serialized form.
  /// The removed element is replaced by the last element of the vector.
  /// Does not preserve ordering, but is `O(1)`.


  swapRemove(index) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else if (index + 1 == this.length) {
      return this.pop();
    } else {
      let key = indexToKey(this.prefix, index);
      let last = this.pop();

      if (storageWrite(key, JSON.stringify(last))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  push(element) {
    let key = indexToKey(this.prefix, this.length);
    this.length += 1;
    storageWrite(key, JSON.stringify(element));
  }

  pop() {
    if (this.isEmpty()) {
      return null;
    } else {
      let lastIndex = this.length - 1;
      let lastKey = indexToKey(this.prefix, lastIndex);
      this.length -= 1;

      if (storageRemove(lastKey)) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  replace(index, element) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else {
      let key = indexToKey(this.prefix, index);

      if (storageWrite(key, JSON.stringify(element))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  extend(elements) {
    for (let element of elements) {
      this.push(element);
    }
  }

  [Symbol.iterator]() {
    return new VectorIterator(this);
  }

  clear() {
    for (let i = 0; i < this.length; i++) {
      let key = indexToKey(this.prefix, i);
      storageRemove(key);
    }

    this.length = 0;
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let vector = new Vector(data.prefix);
    vector.length = data.length;
    return vector;
  }

}
class VectorIterator {
  constructor(vector) {
    this.current = 0;
    this.vector = vector;
  }

  next() {
    if (this.current < this.vector.len()) {
      let value = this.vector.get(this.current);
      this.current += 1;
      return {
        value,
        done: false
      };
    }

    return {
      value: null,
      done: true
    };
  }

}

const ERR_INCONSISTENT_STATE = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
class UnorderedMap {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
    this.keyIndexPrefix = prefix + "i";
    let indexKey = prefix + "k";
    let indexValue = prefix + "v";
    this.keys = new Vector(indexKey);
    this.values = new Vector(indexValue);
  }

  len() {
    let keysLen = this.keys.len();
    let valuesLen = this.values.len();

    if (keysLen != valuesLen) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return keysLen;
  }

  isEmpty() {
    let keysIsEmpty = this.keys.isEmpty();
    let valuesIsEmpty = this.values.isEmpty();

    if (keysIsEmpty != valuesIsEmpty) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return keysIsEmpty;
  }

  serializeIndex(index) {
    let data = new Uint32Array([index]);
    let array = new Uint8Array(data.buffer);
    return u8ArrayToBytes(array);
  }

  deserializeIndex(rawIndex) {
    let array = bytesToU8Array(rawIndex);
    let data = new Uint32Array(array.buffer);
    return data[0];
  }

  getIndexRaw(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);
    return indexRaw;
  }

  get(key) {
    let indexRaw = this.getIndexRaw(key);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      let value = this.values.get(index);

      if (value) {
        return value;
      } else {
        throw new Error(ERR_INCONSISTENT_STATE);
      }
    }

    return null;
  }

  set(key, value) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      return this.values.replace(index, value);
    } else {
      let nextIndex = this.len();
      let nextIndexRaw = this.serializeIndex(nextIndex);
      storageWrite(indexLookup, nextIndexRaw);
      this.keys.push(key);
      this.values.push(value);
      return null;
    }
  }

  remove(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      if (this.len() == 1) {
        // If there is only one element then swap remove simply removes it without
        // swapping with the last element.
        storageRemove(indexLookup);
      } else {
        // If there is more than one element then swap remove swaps it with the last
        // element.
        let lastKey = this.keys.get(this.len() - 1);

        if (!lastKey) {
          throw new Error(ERR_INCONSISTENT_STATE);
        }

        storageRemove(indexLookup); // If the removed element was the last element from keys, then we don't need to
        // reinsert the lookup back.

        if (lastKey != key) {
          let lastLookupKey = this.keyIndexPrefix + JSON.stringify(lastKey);
          storageWrite(lastLookupKey, indexRaw);
        }
      }

      let index = this.deserializeIndex(indexRaw);
      this.keys.swapRemove(index);
      return this.values.swapRemove(index);
    }

    return null;
  }

  clear() {
    for (let key of this.keys) {
      let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
      storageRemove(indexLookup);
    }

    this.keys.clear();
    this.values.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return new UnorderedMapIterator(this);
  }

  extend(kvs) {
    for (let [k, v] of kvs) {
      this.set(k, v);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let map = new UnorderedMap(data.prefix); // reconstruct UnorderedMap

    map.length = data.length; // reconstruct keys Vector

    map.keys = new Vector(data.prefix + "k");
    map.keys.length = data.keys.length; // reconstruct values Vector

    map.values = new Vector(data.prefix + "v");
    map.values.length = data.values.length;
    return map;
  }

}

class UnorderedMapIterator {
  constructor(unorderedMap) {
    this.keys = new VectorIterator(unorderedMap.keys);
    this.values = new VectorIterator(unorderedMap.values);
  }

  next() {
    let key = this.keys.next();
    let value = this.values.next();

    if (key.done != value.done) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return {
      value: [key.value, value.value],
      done: key.done
    };
  }

}

var _class, _class2;

let ZkContract = NearBindgen(_class = (_class2 = class ZkContract extends NearContract {
  constructor() {
    super();
  }

  default() {
    this.mobileToUser = new UnorderedMap('unique-id-map1');
    return new ZkContract();
  }

  createTree(witness) {
    var merkleTree = [];
    const size = witness.length;

    for (var i = 0; i < size; i++) {
      merkleTree.push(sha256(witness[i] + ""));
    }

    for (var i = 0; i < size; i++) {
      merkleTree = [""].concat(merkleTree);
    }

    for (var i = size - 1; i > 0; i--) {
      merkleTree[i] = sha256(merkleTree[i * 2] + merkleTree[i * 2 + 1]);
    }

    return merkleTree;
  }

  createWitness(user, condition) {
    var witness = [0];
    var age = user[0];
    var income = user[1];
    var score = user[2];
    var c1 = condition[0];
    var c2 = condition[1];
    var c3 = condition[2];

    if (age >= c1) {
      witness.push(1);
    } else {
      witness.push(0);
    }

    if (income >= c2) {
      witness.push(1);
    } else {
      witness.push(0);
    }

    if (score >= c3) {
      witness.push(1);
    } else {
      witness.push(0);
    } //return user;
    //witness.push(0)


    return witness;
  }

  getProof(args) {
    var user = args['args']['user'];
    var condition = args['args']['condition'];
    var witness = this.createWitness(user, condition);
    var tree = this.createTree(witness);
    /*var j: number;
    for(var i: number = 0; user.length; i++) {
        j = i + 1;
        proof.push(tree[j]);
        j = (i+1) * 2;
        while(true){
        proof.push(tree[j]);
        if(j*2 < tree.length) {
            j = j*2;
        }else{
            break;
        }
        }
        proof.push(tree[j+1]);
    }*/
    //return witness;

    return tree;
  }

  verifyProofAndUpdate(args) {
    var proof = args['args']['proof'];
    var mobile = args['args']['mobile'];
    var name = args['args']['name'];
    var witness = [0, 1, 1, 1];
    var tree = this.createTree(witness);
    var status = tree[1].normalize().substring(0, 1) === proof[1].normalize().substring(0, 1);
    return [name, mobile, status + ""];
  }

  uploadData(args) {
    this.mobileToUser.set(args['mobile'], {
      name: args['name'],
      status: args['status']
    });
    return args;
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "createTree", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "createTree"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "createWitness", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "createWitness"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getProof", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getProof"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "verifyProofAndUpdate", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "verifyProofAndUpdate"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "uploadData", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "uploadData"), _class2.prototype)), _class2)) || _class;

function init() {
  ZkContract._init();
}
function uploadData() {
  let _contract = ZkContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.uploadData(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function verifyProofAndUpdate() {
  let _contract = ZkContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.verifyProofAndUpdate(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getProof() {
  let _contract = ZkContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getProof(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function createWitness() {
  let _contract = ZkContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.createWitness(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function createTree() {
  let _contract = ZkContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.createTree(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}

export { createTree, createWitness, getProof, init, uploadData, verifyProofAndUpdate };
//# sourceMappingURL=contract.js.map
