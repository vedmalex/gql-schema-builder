"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = exports.Enum = exports.Scalar = exports.Interface = exports.Union = exports.Input = exports.Type = exports.Subscription = exports.Mutation = exports.Query = exports.Fields = exports.Directive = exports.GQLType = exports.isValidSchema = exports.isValidInput = exports.isIGQLInput = exports.ModelType = void 0;
const graphql_merge_schema_1 = __importDefault(require("./graphql-merge-schema"));
const lodash_1 = require("lodash");
const graphql_1 = require("graphql");
const _ = require("lodash");
function isResolverHook(inp) {
    return inp instanceof Function && inp.length > 0;
}
var ModelType;
(function (ModelType) {
    ModelType["query"] = "query";
    ModelType["directive"] = "directive";
    ModelType["mutation"] = "mutation";
    ModelType["subscription"] = "subscription";
    ModelType["type"] = "type";
    ModelType["input"] = "input";
    ModelType["union"] = "union";
    ModelType["interface"] = "interface";
    ModelType["scalar"] = "scalar";
    ModelType["enum"] = "enum";
    ModelType["schema"] = "schema";
    ModelType["hook"] = "hook";
})(ModelType = exports.ModelType || (exports.ModelType = {}));
const typeMap = {
    [graphql_1.Kind.ENUM_TYPE_DEFINITION]: ModelType.enum,
    [graphql_1.Kind.ENUM_TYPE_EXTENSION]: ModelType.enum,
    [graphql_1.Kind.INPUT_OBJECT_TYPE_DEFINITION]: ModelType.input,
    [graphql_1.Kind.INPUT_OBJECT_TYPE_EXTENSION]: ModelType.input,
    [graphql_1.Kind.INTERFACE_TYPE_DEFINITION]: ModelType.interface,
    [graphql_1.Kind.INTERFACE_TYPE_EXTENSION]: ModelType.interface,
    [graphql_1.Kind.SCALAR_TYPE_DEFINITION]: ModelType.scalar,
    [graphql_1.Kind.SCALAR_TYPE_EXTENSION]: ModelType.scalar,
    [graphql_1.Kind.UNION_TYPE_DEFINITION]: ModelType.union,
    [graphql_1.Kind.UNION_TYPE_EXTENSION]: ModelType.union,
    [graphql_1.Kind.OBJECT_TYPE_DEFINITION]: ModelType.type,
    [graphql_1.Kind.OBJECT_TYPE_EXTENSION]: ModelType.type,
    [graphql_1.Kind.SCHEMA_DEFINITION]: ModelType.schema,
    [graphql_1.Kind.DIRECTIVE_DEFINITION]: ModelType.directive,
};
function isIGQLInput(inp) {
    return (inp &&
        typeof inp === 'object' &&
        (inp.hasOwnProperty('schema') ||
            inp.hasOwnProperty('type') ||
            inp.hasOwnProperty('resolver')));
}
exports.isIGQLInput = isIGQLInput;
function isValidInput(inp) {
    if (isIGQLInput(inp)) {
        return isValidSchema(inp.schema) || inp.resolver || inp.type;
    }
    else if (typeof inp === 'object') {
        return isValidSchema(inp);
    }
    else if (typeof inp === 'string') {
        return isValidSchema(inp);
    }
    else {
        return false;
    }
}
exports.isValidInput = isValidInput;
function isValidSchema(inp) {
    if (typeof inp === 'object') {
        return (inp.kind == 'Document' &&
            Array.isArray(inp.definitions));
    }
    else if (typeof inp === 'string') {
        try {
            (0, graphql_1.parse)(inp);
        }
        catch (_a) {
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}
exports.isValidSchema = isValidSchema;
class GQLType {
    constructor(args) {
        this.complex = false;
        if (isValidInput(args)) {
            if (isIGQLInput(args)) {
                this.attachSchema(args.schema);
                this.attachResolver(args.resolver);
                this._name = this.resolveName(args.schema);
            }
            else if (isValidSchema(args)) {
                this.attachSchema(args);
                this._name = this.resolveName(args);
            }
        }
    }
    get isExtend() {
        return this._isExtend;
    }
    get type() {
        return this._type;
    }
    get name() {
        return this._name;
    }
    get schema() {
        return this._schema;
    }
    get schemaAST() {
        return this._schemaAST;
    }
    get resolver() {
        return this._resolver;
    }
    get valid() {
        return !!this._schema && !!this._name;
    }
    static create(inp) {
        if (isValidInput(inp)) {
            let schema;
            let type;
            if (isIGQLInput(inp)) {
                schema = inp.schema;
                type = inp.type;
            }
            else if (typeof inp === 'object') {
                schema = inp;
            }
            else if (typeof inp === 'string') {
                schema = (0, graphql_1.parse)(inp);
            }
            if (type) {
                if (isValidInput(inp)) {
                    switch (type) {
                        case 'enum':
                            return new Enum(inp);
                        case 'input':
                            return new Input(inp);
                        case 'interface':
                            return new Interface(inp);
                        case 'scalar':
                            return new Scalar(inp);
                        case 'union':
                            return new Union(inp);
                        case 'type':
                            return new Type(inp);
                        case 'query':
                            return new Query(inp);
                        case 'mutation':
                            return new Mutation(inp);
                        case 'subscription':
                            return new Subscription(inp);
                        case 'schema':
                        default:
                            throw new Error('unknown type');
                    }
                }
            }
            else if (schema && isValidInput(inp)) {
                return schema.definitions
                    .map((typedef) => {
                    switch (typeMap[typedef.kind]) {
                        case ModelType.enum:
                            return new Enum(typedef);
                        case ModelType.input:
                            return new Input(typedef);
                        case ModelType.interface:
                            return new Interface(typedef);
                        case ModelType.scalar:
                            return new Scalar(typedef);
                        case ModelType.union:
                            return new Union(typedef);
                        case ModelType.type: {
                            if (typedef.name.value.match(/Mutation/i)) {
                                return new Mutation(typedef);
                            }
                            else if (typedef.name.value.match(/Query/i)) {
                                return new Query(typedef);
                            }
                            else if (typedef.name.value.match(/Subscription/i)) {
                                return new Subscription(typedef);
                            }
                            else {
                                return new Type(typedef);
                            }
                        }
                        case ModelType.schema:
                            return;
                        case ModelType.directive:
                            return new Directive(typedef);
                        default:
                            throw new Error('unknown type');
                    }
                })
                    .filter((f) => f);
            }
        }
        else if (isValidSchemaInput(inp)) {
            return new Schema(inp);
        }
        else {
            throw new Error('not valid input');
        }
        return;
    }
    resolveName(schema) {
        const parsed = typeof schema === 'string' ? (0, graphql_1.parse)(schema) : schema;
        if (parsed && parsed.definitions) {
            return parsed.definitions[0].name.value;
        }
        else if (parsed && parsed.hasOwnProperty('name')) {
            return parsed.name.value;
        }
        else {
            throw new Error('nonsence');
        }
    }
    attachResolver(resolver) {
        this._resolver = resolver;
    }
    checkSchema() {
        if (!this.complex) {
            if (this._schemaAST &&
                this._schemaAST.definitions &&
                this._schemaAST.definitions.length > 1) {
                throw new Error('too many types definitions in simple type');
            }
        }
    }
    attachSchema(value) {
        if (isValidSchema(value)) {
            if (typeof value === 'string') {
                this._schema = value;
                this._schemaAST = (0, graphql_1.parse)(value);
            }
            else {
                this._schemaAST = value;
                this._schema = (0, graphql_1.print)(value);
            }
        }
    }
}
exports.GQLType = GQLType;
class Directive extends GQLType {
    constructor(args) {
        super(args);
        this._type = ModelType.directive;
        this.checkSchema();
    }
}
exports.Directive = Directive;
class Fields extends GQLType {
    constructor(args) {
        super(args);
        this._rootName = this.resolveRootName(this._schemaAST);
        this.checkSchema();
    }
    resolveName(schema) {
        const parsed = typeof schema === 'string' ? (0, graphql_1.parse)(schema) : schema;
        let name;
        (0, graphql_1.visit)(parsed, {
            [graphql_1.Kind.FIELD_DEFINITION](node) {
                name = node.name.value;
            },
        });
        return name;
    }
    resolveRootName(schema) {
        const parsed = typeof schema === 'string' ? (0, graphql_1.parse)(schema) : schema;
        let rootName;
        (0, graphql_1.visit)(parsed, {
            [graphql_1.Kind.OBJECT_TYPE_DEFINITION](node) {
                rootName = node.name.value;
            },
            [graphql_1.Kind.OBJECT_TYPE_EXTENSION](node) {
                rootName = node.name.value;
            },
        });
        return rootName;
    }
    get resolver() {
        return this._rootName && this._resolver
            ? { [this._rootName]: { [this.name]: this._resolver } }
            : undefined;
    }
}
exports.Fields = Fields;
class Query extends Fields {
    constructor(args) {
        super(args);
        this._type = ModelType.query;
        this.checkSchema();
    }
}
exports.Query = Query;
class Mutation extends Fields {
    constructor(args) {
        super(args);
        this._type = ModelType.mutation;
        this.checkSchema();
    }
}
exports.Mutation = Mutation;
class Subscription extends Fields {
    constructor(args) {
        super(args);
        this._type = ModelType.subscription;
        this.checkSchema();
    }
}
exports.Subscription = Subscription;
class Type extends GQLType {
    resolveExtend(schema) {
        const parsed = typeof schema === 'string' ? (0, graphql_1.parse)(schema) : schema;
        let extend = false;
        (0, graphql_1.visit)(parsed, {
            [graphql_1.Kind.OBJECT_TYPE_EXTENSION]() {
                extend = true;
            },
        });
        return extend;
    }
    constructor(args) {
        super(args);
        this._type = ModelType.type;
        this._isExtend = this.resolveExtend(this._schemaAST);
        this.checkSchema();
    }
    get resolver() {
        return this.name && this._resolver
            ? { [this.name]: this._resolver }
            : undefined;
    }
}
exports.Type = Type;
class Input extends GQLType {
    constructor(args) {
        super(args);
        this._type = ModelType.input;
        this.checkSchema();
    }
}
exports.Input = Input;
class Union extends GQLType {
    constructor(args) {
        super(args);
        this._type = ModelType.union;
        this.checkSchema();
    }
    get resolver() {
        return this._resolver
            ? {
                [this.name]: {
                    __resolveType: this._resolver,
                },
            }
            : {
                [this.name]: {
                    __resolveType: () => null,
                },
            };
    }
}
exports.Union = Union;
class Interface extends GQLType {
    constructor(args) {
        super(args);
        this._type = ModelType.interface;
        this.checkSchema();
    }
    get resolver() {
        return this._resolver
            ? {
                [this.name]: {
                    __resolveType: this._resolver,
                },
            }
            : {
                [this.name]: {
                    __resolveType: () => null,
                },
            };
    }
}
exports.Interface = Interface;
function isCustomScalar(inp) {
    return (typeof inp === 'object' &&
        (inp.hasOwnProperty('serialize') ||
            inp.hasOwnProperty('parseValue') ||
            inp.hasOwnProperty('parseLiteral')));
}
class Scalar extends GQLType {
    constructor(args) {
        super(args);
        this._type = ModelType.scalar;
        if (isCustomScalar(args)) {
            this._resolver = new graphql_1.GraphQLScalarType({
                name: this.name,
                serialize: args.serialize,
                parseLiteral: args.parseLiteral,
                parseValue: args.parseLiteral,
                astNode: this._schemaAST,
            });
        }
        this.checkSchema();
    }
    get resolver() {
        return this.name && this._resolver
            ? { [this.name]: this._resolver }
            : undefined;
    }
}
exports.Scalar = Scalar;
class Enum extends GQLType {
    get resolver() {
        return this._resolver && this.name
            ? { [this.name]: this._resolver }
            : undefined;
    }
    constructor(args) {
        super(args);
        this._type = ModelType.enum;
        this.checkSchema();
    }
}
exports.Enum = Enum;
function isValidSchemaInput(inp) {
    if (typeof inp === 'string') {
        return true;
    }
    if (typeof inp === 'object' && inp.hasOwnProperty('name')) {
        return true;
    }
    return false;
}
class Schema extends GQLType {
    constructor(args) {
        super(args);
        this.complex = true;
        this._hooks = [];
        this._items = [];
        this._isBuilt = false;
        this._rootQuery = 'Query';
        this._rootMutation = 'Mutation';
        this._rootSubscription = 'Subscription';
        this._type = ModelType.schema;
        if (args && typeof args === 'string') {
            this._name = args;
        }
        if (args && typeof args !== 'string') {
            const { name, items, rootMutation, rootQuery, rootSubscription, hooks, schema, } = args;
            if (schema) {
                this._initialSchema = this._schema;
            }
            if (name) {
                this._name = name;
            }
            if (rootMutation) {
                this._rootMutation = rootMutation;
            }
            if (rootQuery) {
                this._rootQuery = rootQuery;
            }
            if (rootSubscription) {
                this._rootSubscription = rootSubscription;
            }
            if (items) {
                if (Array.isArray(items)) {
                    items.forEach((item) => {
                        this.add(this.create(item));
                    });
                }
                else {
                    this.add(this.create(items));
                }
            }
            if (hooks) {
                if (Array.isArray(hooks)) {
                    this._hooks.push(...hooks);
                }
                else if (isResolverHook(hooks)) {
                    this._hooks.push(hooks);
                }
            }
        }
        this.checkSchema();
    }
    get queries() {
        return this._queries;
    }
    get mutations() {
        return this._mutations;
    }
    get subscriptions() {
        return this._subscriptions;
    }
    get items() {
        return this._items;
    }
    get hooks() {
        return [
            ...(this._hooks.length > 0 ? this._hooks : []),
            ...(this._isBuilt && this._compiledHooks && this._compiledHooks.length > 0
                ? this._compiledHooks
                : []),
        ];
    }
    get resolvers() {
        return this._resolvers;
    }
    get isBuilt() {
        return this._isBuilt;
    }
    get valid() {
        return true;
    }
    get schema() {
        return this._isBuilt ? this._schema : '';
    }
    create(inp) {
        if (isValidInput(inp)) {
            return GQLType.create(inp);
        }
        else {
            return inp;
        }
    }
    add(inp) {
        if (Array.isArray(inp)) {
            return inp.map((i) => {
                return this.add(i);
            });
        }
        else if (inp) {
            if (this._items.indexOf(inp) === -1) {
                this._items.push(inp);
                return inp;
            }
        }
    }
    build(force = false) {
        if (!this._isBuilt || force) {
            if (Array.isArray(this._items) && this._items.length > 0) {
                this._items
                    .filter((i) => i instanceof Schema)
                    .forEach((i) => i.build());
                this._schema = (0, graphql_merge_schema_1.default)([...this._items.map((i) => i.schema), this._initialSchema].filter((i) => i));
                this._schemaAST = (0, graphql_1.parse)(this._schema);
                this._resolversClean = this._resolvers = (0, lodash_1.merge)(this._resolver, ...this._items
                    .map((i) => i instanceof Schema ? i.resolvers : i.resolver)
                    .filter((i) => i));
                this._compiledHooks = this._items
                    .filter((r) => r.type === ModelType.schema)
                    .map((r) => r.hooks)
                    .reduce((res, curr) => {
                    res.push(...curr);
                    return res;
                }, []);
                this._isBuilt = true;
            }
            else {
                this._resolversClean = this._resolvers = this._resolver;
                this._isBuilt = true;
            }
        }
    }
    resolveName() {
        return '';
    }
    applyHooks() {
        const modelHooks = this.hooks;
        for (let i = 0, len = modelHooks.length; i < len; i++) {
            const hookList = Object.keys(modelHooks[i]);
            for (let j = 0, jLen = hookList.length; j < jLen; j++) {
                const key = hookList[j];
                const resoler = (0, lodash_1.get)(this.resolvers, key);
                (0, lodash_1.set)(this.resolvers, key, modelHooks[i][key](resoler));
            }
        }
    }
    fixSchema() {
        this.attachSchema(_.cloneDeepWith(this._schemaAST, cloneCustomizer));
    }
}
exports.Schema = Schema;
const needToFix = (def) => def.kind === graphql_1.Kind.ENUM_TYPE_EXTENSION ||
    def.kind === graphql_1.Kind.INPUT_OBJECT_TYPE_EXTENSION ||
    def.kind === graphql_1.Kind.INTERFACE_TYPE_EXTENSION ||
    def.kind === graphql_1.Kind.OBJECT_TYPE_EXTENSION ||
    def.kind === graphql_1.Kind.SCALAR_TYPE_EXTENSION ||
    def.kind === graphql_1.Kind.UNION_TYPE_EXTENSION;
function cloneCustomizer(value) {
    if (value && value.kind && needToFix(value)) {
        return {
            ...value,
            kind: value.kind.replace(/Extension/i, 'Definition'),
        };
    }
    else if (value && value.kind && value.kind !== graphql_1.Kind.DOCUMENT) {
        return value;
    }
}
//# sourceMappingURL=index.js.map