"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const _ = __importStar(require("lodash"));
const graphql_2 = require("graphql");
const isObjectTypeDefinition = (def) => def.kind === graphql_2.Kind.OBJECT_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.INPUT_OBJECT_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.ENUM_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.INTERFACE_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.SCALAR_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.UNION_TYPE_DEFINITION ||
    def.kind === graphql_2.Kind.DIRECTIVE_DEFINITION ||
    def.kind === graphql_2.Kind.SCHEMA_DEFINITION ||
    def.kind === graphql_2.Kind.ENUM_TYPE_EXTENSION ||
    def.kind === graphql_2.Kind.INPUT_OBJECT_TYPE_EXTENSION ||
    def.kind === graphql_2.Kind.INTERFACE_TYPE_EXTENSION ||
    def.kind === graphql_2.Kind.OBJECT_TYPE_EXTENSION ||
    def.kind === graphql_2.Kind.SCALAR_TYPE_EXTENSION ||
    def.kind === graphql_2.Kind.UNION_TYPE_EXTENSION;
function compareNode(curr, other) {
    if (curr.kind === graphql_2.Kind.NAME) {
        return curr.value === other.value;
    }
    else {
        return curr.name.value === other.name.value;
    }
}
function mergeDefinitions(objValue, srcValue) {
    const same = _.intersectionWith(srcValue, objValue, compareNode);
    const created = _.differenceWith(srcValue, objValue, compareNode);
    const last = _.differenceWith(objValue, srcValue, compareNode);
    return last.concat(same, created);
}
function nodeMerger(objValue, srcValue, key, object, source, stack) {
    if (stack.size === 0) {
        if (!object.hasOwnProperty(key)) {
            return srcValue;
        }
    }
    else {
        switch (key) {
            case 'kind': {
                if (!object.kind.match(/Definition/)) {
                    if (source.kind.match(/Definition/)) {
                        return srcValue;
                    }
                    else {
                        return object.kind.replace(/Extension/i, 'Definition');
                    }
                }
                else {
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
const _makeMergedDefinitions = (defs) => {
    const groupedMergeableDefinitions = defs
        .filter((def) => isObjectTypeDefinition(def))
        .reduce((mergeableDefs, def) => {
        return _.mergeWith(mergeableDefs, {
            [def.kind !== graphql_2.Kind.SCHEMA_DEFINITION
                ? def.name.value
                : 'schema']: def,
        }, nodeMerger);
    }, {});
    return Object.values(groupedMergeableDefinitions).reduce((array, def) => (def ? [...array, def] : array), []);
};
const _makeDocumentWithDefinitions = (definitions) => ({
    kind: 'Document',
    definitions: definitions instanceof Array ? definitions : [definitions],
});
const printDefinitions = (defs) => graphql_1.print(_makeDocumentWithDefinitions(defs));
const mergeTypes = (types) => {
    const allDefs = types
        .map((type) => {
        if (typeof type === 'string') {
            return graphql_1.parse(type);
        }
        return type;
    })
        .map((ast) => ast.definitions)
        .reduce((defs, newDef) => [...defs, ...newDef], []);
    const mergedDefs = _makeMergedDefinitions(allDefs);
    return printDefinitions(mergedDefs);
};
exports.default = mergeTypes;
//# sourceMappingURL=graphql-merge-schema.js.map