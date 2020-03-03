// NOTE: Currently using a slightly modified print instead of the exported graphql version.
import { parse, print, ASTNode } from 'graphql';
import * as _ from 'lodash';

import { Kind } from 'graphql';

const isObjectTypeDefinition = def =>
  def.kind === Kind.OBJECT_TYPE_DEFINITION ||
  def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
  def.kind === Kind.ENUM_TYPE_DEFINITION ||
  def.kind === Kind.INTERFACE_TYPE_DEFINITION ||
  def.kind === Kind.SCALAR_TYPE_DEFINITION ||
  def.kind === Kind.UNION_TYPE_DEFINITION ||
  def.kind === Kind.DIRECTIVE_DEFINITION ||
  def.kind === Kind.SCHEMA_DEFINITION ||
  def.kind === Kind.ENUM_TYPE_EXTENSION ||
  def.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.INTERFACE_TYPE_EXTENSION ||
  def.kind === Kind.OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.SCALAR_TYPE_EXTENSION ||
  def.kind === Kind.UNION_TYPE_EXTENSION;

function compareNode(curr, other) {
  if (curr.kind === Kind.NAME) {
    return curr.value === other.value;
  } else {
    return curr.name.value === other.name.value;
  }
}

function mergeDefinitions(objValue, srcValue) {
  let same = _.intersectionWith(srcValue, objValue, compareNode);
  let created = _.differenceWith(srcValue, objValue, compareNode);
  let last = _.differenceWith(objValue, srcValue, compareNode);
  return last.concat(same, created);
}

function nodeMerger(objValue, srcValue, key, object, source, stack) {
  if (stack.size === 0) {
    if (!object.hasOwnProperty(key)) {
      return srcValue;
    }
  } else {
    switch (key) {
      case 'kind': {
        if (!object.kind.match(/Definition/)) {
          if (source.kind.match(/Definition/)) {
            return srcValue;
          } else {
            return object.kind.replace(/Extension/i, 'Definition');
          }
        } else {
          return objValue;
        }
      }
      case 'loc':
        return objValue;
      case 'name':
        return objValue;
      case 'directives':
        return mergeDefinitions(objValue, srcValue);
      case 'fields':
        return mergeDefinitions(objValue, srcValue);
      case 'values':
        return mergeDefinitions(objValue, srcValue);
      case 'types':
        return mergeDefinitions(objValue, srcValue);
      case 'interfaces':
        return mergeDefinitions(objValue, srcValue);
      case 'arguments':
        return mergeDefinitions(objValue, srcValue);
      case 'locations':
        return mergeDefinitions(objValue, srcValue);
      default:
        return;
    }
  }
}

const _makeMergedDefinitions = defs => {
  // TODO: This function can be cleaner!
  const groupedMergeableDefinitions = defs
    .filter(def => isObjectTypeDefinition(def))
    .reduce((mergeableDefs, def) => {
      return _.mergeWith(
        mergeableDefs,
        {
          [def.kind !== Kind.SCHEMA_DEFINITION
            ? def.name.value
            : 'schema']: def,
        },
        nodeMerger,
      );
    }, {});

  return Object.values(groupedMergeableDefinitions).reduce(
    (array: {}[], def) => (def ? [...array, def] : array),
    [],
  );
};

const _makeDocumentWithDefinitions = definitions => ({
  kind: 'Document',
  definitions: definitions instanceof Array ? definitions : [definitions],
});

const printDefinitions = defs =>
  print(_makeDocumentWithDefinitions(defs) as ASTNode);

const mergeTypes = types => {
  const allDefs = types
    .map(type => {
      if (typeof type === 'string') {
        return parse(type);
      }
      return type;
    })
    .map(ast => ast.definitions)
    .reduce((defs, newDef) => [...defs, ...newDef], []);
  const mergedDefs = _makeMergedDefinitions(allDefs);
  return printDefinitions(mergedDefs);
};

export default mergeTypes;
