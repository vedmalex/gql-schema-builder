import { IResolvers, IEnumResolver } from 'graphql-tools'
import mergeTypes from './graphql-merge-schema'
import { merge, get, set } from 'lodash'

import {
  parse,
  print,
  DocumentNode,
  DefinitionNode,
  visit,
  Kind,
  GraphQLScalarType,
  NamedTypeNode,
} from 'graphql'

import _ = require('lodash')

export type ResolverFunction = (
  owner: any,
  args: any,
  context: any,
  info: any,
) => Promise<any> | any

export type ResolverHookFunction = (
  target: ResolverFunction | IResolvers,
) => ResolverFunction

export type ResolverHook = { [key: string]: ResolverHookFunction }

function isResolverHook(inp: string | any): inp is ResolverHookFunction {
  return inp instanceof Function && inp.length > 0
}

export type UnionInterfaceResolverFunction = (
  owner: any,
  context: any,
  info: any,
) => Promise<any> | any

export type ScalarResolver = ScalarResolverType | GraphQLScalarType
export type ScalarResolverType = {
  serialize?: any
  parseValue?: any
  parseLiteral?: any
}

export type EnumResolver = {
  [key: string]: IEnumResolver
}

export type FieldDefinition = {
  name: string
  description: string
  type: any
  resolve: ResolverFunction
}

export enum ModelType {
  query = 'query',
  directive = 'directive',
  mutation = 'mutation',
  subscription = 'subscription',
  type = 'type',
  input = 'input',
  union = 'union',
  interface = 'interface',
  scalar = 'scalar',
  enum = 'enum',
  schema = 'schema',
  hook = 'hook',
}

const typeMap = {
  [Kind.ENUM_TYPE_DEFINITION]: ModelType.enum,
  [Kind.ENUM_TYPE_EXTENSION]: ModelType.enum,
  [Kind.INPUT_OBJECT_TYPE_DEFINITION]: ModelType.input,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: ModelType.input,
  [Kind.INTERFACE_TYPE_DEFINITION]: ModelType.interface,
  [Kind.INTERFACE_TYPE_EXTENSION]: ModelType.interface,
  [Kind.SCALAR_TYPE_DEFINITION]: ModelType.scalar,
  [Kind.SCALAR_TYPE_EXTENSION]: ModelType.scalar,
  [Kind.UNION_TYPE_DEFINITION]: ModelType.union,
  [Kind.UNION_TYPE_EXTENSION]: ModelType.union,
  [Kind.OBJECT_TYPE_DEFINITION]: ModelType.type,
  [Kind.OBJECT_TYPE_EXTENSION]: ModelType.type,
  [Kind.SCHEMA_DEFINITION]: ModelType.schema,
  [Kind.DIRECTIVE_DEFINITION]: ModelType.directive,
}

export type ModelTypes = keyof typeof ModelType

export type ObjectResolver = {
  [property: string]: ResolverFunction | FieldDefinition
}

export type Resolver = {
  [entity: string]: ObjectResolver
}

export function isIGQLInput(inp: {
  hasOwnProperty: (arg0: string) => any
}): inp is IGQLBaseInput {
  return (
    inp &&
    typeof inp === 'object' &&
    (inp.hasOwnProperty('schema') ||
      inp.hasOwnProperty('type') ||
      inp.hasOwnProperty('resolver'))
  )
}

export function isValidInput(
  inp: any,
): inp is IGQLBaseInput | IGQLInput | string | DocumentNode {
  if (isIGQLInput(inp)) {
    return isValidSchema(inp.schema) || inp.resolver || inp.type
  } else if (typeof inp === 'object') {
    return isValidSchema(inp)
  } else if (typeof inp === 'string') {
    return isValidSchema(inp)
  } else {
    return false
  }
}

export function isValidSchema(inp: unknown): inp is string | DocumentNode {
  if (typeof inp === 'object') {
    return (
      (inp as DocumentNode).kind == 'Document' &&
      Array.isArray((inp as DocumentNode).definitions)
    )
  } else if (typeof inp === 'string') {
    try {
      parse(inp)
    } catch {
      return false
    }
    return true
  } else {
    return false
  }
}

export interface IGQLBaseInput<Reslvr = any> {
  type?: ModelTypes
  schema?: string | DocumentNode
  resolver?: Reslvr
}

export interface IGQLInput<Reslvr = any> extends IGQLBaseInput<Reslvr> {
  type?: ModelTypes
  schema: string | DocumentNode
  resolver?: Reslvr
}

export interface IGQLType {
  type: ModelTypes
  schema: string
  schemaAST: DocumentNode
  name?: string
  isExtend: boolean
}

export interface IGQLTypeDef extends IGQLType {
  type: ModelTypes
  resolver?: IResolvers
}

export abstract class GQLType<Reslvr = any> implements Readonly<IGQLTypeDef> {
  public get isExtend(): boolean {
    return this._isExtend
  }
  public get type(): ModelTypes {
    return this._type
  }
  public get name(): string {
    return this._name
  }
  public get schema(): string {
    return this._schema
  }
  public get schemaAST(): DocumentNode {
    return this._schemaAST
  }
  public get resolver(): undefined | IResolvers {
    return this._resolver
  }
  public get valid(): boolean {
    return !!this._schema && !!this._name
  }
  public complex: boolean = false
  protected _isExtend!: boolean
  protected _type!: ModelType
  protected _name!: string
  protected _schema!: string
  protected _schemaAST!: DocumentNode
  protected _resolver?: any
  protected node!: Array<DefinitionNode> | DefinitionNode
  public static create(
    inp: IGQLInput | string | DocumentNode,
  ): GQLType | Array<GQLType> | any {
    if (isValidInput(inp)) {
      let schema
      let type: ModelTypes | undefined
      if (isIGQLInput(inp)) {
        schema = inp.schema
        type = inp.type
      } else if (typeof inp === 'object') {
        schema = inp
      } else if (typeof inp === 'string') {
        schema = parse(inp)
      }

      if (type) {
        if (isValidInput(inp)) {
          switch (type) {
            case 'enum':
              return new Enum(inp)
            case 'input':
              return new Input(inp)
            case 'interface':
              return new Interface(inp)
            case 'scalar':
              return new Scalar(inp)
            case 'union':
              return new Union(inp)
            case 'type':
              return new Type(inp)
            case 'query':
              return new Query(inp)
            case 'mutation':
              return new Mutation(inp)
            case 'subscription':
              return new Subscription(inp)
            case 'schema':
            default:
              throw new Error('unknown type')
          }
        }
      } else if (schema && isValidInput(inp)) {
        return schema.definitions
          .map((typedef) => {
            switch (typeMap[typedef.kind]) {
              case ModelType.enum:
                return new Enum(typedef)
              case ModelType.input:
                return new Input(typedef)
              case ModelType.interface:
                return new Interface(typedef)
              case ModelType.scalar:
                return new Scalar(typedef)
              case ModelType.union:
                return new Union(typedef)
              case ModelType.type: {
                if (typedef.name.value.match(/Mutation/i)) {
                  return new Mutation(typedef)
                } else if (typedef.name.value.match(/Query/i)) {
                  return new Query(typedef)
                } else if (typedef.name.value.match(/Subscription/i)) {
                  return new Subscription(typedef)
                } else {
                  return new Type(typedef)
                }
              }
              case ModelType.schema:
                return
              case ModelType.directive:
                return new Directive(typedef)

              default:
                throw new Error('unknown type')
            }
          })
          .filter((f: any) => f)
      }
    } else if (isValidSchemaInput(inp)) {
      return new Schema(inp)
    } else {
      throw new Error('not valid input')
    }
    return
  }
  protected resolveName(schema: string | DocumentNode | undefined) {
    const parsed = typeof schema === 'string' ? parse(schema) : schema
    if (parsed && parsed.definitions) {
      return (parsed.definitions[0] as any as NamedTypeNode).name.value
    } else if (parsed && parsed.hasOwnProperty('name')) {
      return (parsed as any as NamedTypeNode).name.value
    } else {
      throw new Error('nonsence')
    }
  }
  constructor(
    args: IGQLBaseInput<Reslvr> | IGQLInput<Reslvr> | string | DocumentNode,
  ) {
    if (isValidInput(args)) {
      if (isIGQLInput(args)) {
        this.attachSchema(args.schema)
        this.attachResolver(args.resolver)
        this._name = this.resolveName(args.schema)
      } else if (isValidSchema(args)) {
        this.attachSchema(args)
        this._name = this.resolveName(args)
      }
    }
  }
  public attachResolver(resolver: Reslvr | undefined) {
    this._resolver = resolver
  }

  public checkSchema() {
    if (!this.complex) {
      if (
        this._schemaAST &&
        this._schemaAST.definitions &&
        this._schemaAST.definitions.length > 1
      ) {
        throw new Error('too many types definitions in simple type')
      }
    }
  }

  public attachSchema(value: string | DocumentNode | undefined) {
    if (isValidSchema(value)) {
      if (typeof value === 'string') {
        this._schema = value
        this._schemaAST = parse(value)
      } else {
        this._schemaAST = value
        this._schema = print(value)
      }
    }
  }
}

export class Directive extends GQLType {
  constructor(args: any) {
    super(args)
    this._type = ModelType.directive
    this.checkSchema()
  }
}

export class Fields<Reslvr>
  extends GQLType<Reslvr>
  implements Readonly<IGQLTypeDef>
{
  protected _rootName: string
  protected resolveName(schema: string | DocumentNode) {
    const parsed = typeof schema === 'string' ? parse(schema) : schema
    let name: any
    visit(parsed, {
      [Kind.FIELD_DEFINITION](node: { name: { value: any } }) {
        name = node.name.value
      },
    })
    return name
  }
  protected resolveRootName(schema: string | DocumentNode) {
    const parsed = typeof schema === 'string' ? parse(schema) : schema
    let rootName: any
    visit(parsed, {
      [Kind.OBJECT_TYPE_DEFINITION](node: { name: { value: any } }) {
        rootName = node.name.value
      },
      [Kind.OBJECT_TYPE_EXTENSION](node: { name: { value: any } }) {
        rootName = node.name.value
      },
    })
    return rootName
  }
  constructor(args: any) {
    super(args)
    this._rootName = this.resolveRootName(this._schemaAST)
    this.checkSchema()
  }
  public get resolver() {
    return this._rootName && this._resolver
      ? { [this._rootName]: { [this.name]: this._resolver } }
      : undefined
  }
}

export class Query
  extends Fields<ResolverFunction>
  implements Readonly<IGQLTypeDef>
{
  constructor(args: IGQLInput<ResolverFunction> | string | DocumentNode) {
    super(args)
    this._type = ModelType.query
    this.checkSchema()
  }
}

export class Mutation
  extends Fields<ResolverFunction>
  implements Readonly<IGQLTypeDef>
{
  constructor(args: IGQLInput<ResolverFunction> | string | DocumentNode) {
    super(args)
    this._type = ModelType.mutation
    this.checkSchema()
  }
}

export type SubscriptionResolver = {
  [key: string]:
    | {
        resolve?: (payload: any) => any
      }
    | ResolverFunction
  subscribe: ResolverFunction
}

export class Subscription
  extends Fields<SubscriptionResolver>
  implements Readonly<IGQLTypeDef>
{
  constructor(args: IGQLInput<SubscriptionResolver> | string | DocumentNode) {
    super(args)
    this._type = ModelType.subscription
    this.checkSchema()
  }
}

export class Type
  extends GQLType<ResolverFunction | ObjectResolver>
  implements Readonly<IGQLTypeDef>
{
  public resolveExtend(schema: string | DocumentNode) {
    const parsed = typeof schema === 'string' ? parse(schema) : schema
    let extend = false
    visit(parsed, {
      [Kind.OBJECT_TYPE_EXTENSION]() {
        extend = true
      },
    })
    return extend
  }
  constructor(
    args: IGQLInput<ResolverFunction | ObjectResolver> | string | DocumentNode,
  ) {
    super(args)
    this._type = ModelType.type
    this._isExtend = this.resolveExtend(this._schemaAST)
    this.checkSchema()
  }
  public get resolver() {
    return this.name && this._resolver
      ? { [this.name]: this._resolver }
      : undefined
  }
}

export class Input extends GQLType implements Readonly<IGQLTypeDef> {
  constructor(args: IGQLInput | string | DocumentNode) {
    super(args)
    this._type = ModelType.input
    this.checkSchema()
  }
}

export class Union
  extends GQLType<UnionInterfaceResolverFunction>
  implements Readonly<IGQLTypeDef>
{
  constructor(
    args: IGQLInput<UnionInterfaceResolverFunction> | string | DocumentNode,
  ) {
    super(args)
    this._type = ModelType.union
    this.checkSchema()
  }
  public get resolver() {
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
        }
  }
}

export class Interface
  extends GQLType<UnionInterfaceResolverFunction>
  implements Readonly<IGQLTypeDef>
{
  constructor(
    args: IGQLInput<UnionInterfaceResolverFunction> | string | DocumentNode,
  ) {
    super(args)
    this._type = ModelType.interface
    this.checkSchema()
  }
  public get resolver() {
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
        }
  }
}

function isCustomScalar(inp: {
  hasOwnProperty: (arg0: string) => any
}): inp is ScalarResolverType {
  return (
    typeof inp === 'object' &&
    (inp.hasOwnProperty('serialize') ||
      inp.hasOwnProperty('parseValue') ||
      inp.hasOwnProperty('parseLiteral'))
  )
}

export class Scalar
  extends GQLType<ScalarResolver>
  implements Readonly<IGQLTypeDef>
{
  constructor(args: IGQLInput<ScalarResolver> | string | DocumentNode) {
    super(args)
    this._type = ModelType.scalar
    if (isCustomScalar(args)) {
      this._resolver = new GraphQLScalarType({
        name: this.name,
        serialize: args.serialize,
        parseLiteral: args.parseLiteral,
        parseValue: args.parseLiteral,
        astNode: this._schemaAST as any,
      })
    }
    this.checkSchema()
  }
  public get resolver() {
    return this.name && this._resolver
      ? { [this.name]: this._resolver }
      : undefined
  }
}

export class Enum
  extends GQLType<IEnumResolver>
  implements Readonly<IGQLTypeDef>
{
  public get resolver(): IResolvers | undefined {
    return this._resolver && this.name
      ? { [this.name]: this._resolver }
      : undefined
  }
  constructor(args: IGQLInput<IEnumResolver> | string | DocumentNode) {
    super(args)
    this._type = ModelType.enum
    this.checkSchema()
  }
}

export type PossibleInitType = GQLType | IGQLInput | string | DocumentNode

export type SchemaInit = void | PossibleInitType | Array<PossibleInitType>

function isValidSchemaInput(inp: any): inp is SchemaInput {
  if (typeof inp === 'string') {
    return true
  }
  if (typeof inp === 'object' && inp.hasOwnProperty('name')) {
    return true
  }
  return false
}

export interface SchemaInput extends IGQLBaseInput<IResolvers> {
  name: string
  items?: SchemaInit
  hooks?: Array<ResolverHook> | ResolverHook
  rootQuery?: string
  rootMutation?: string
  rootSubscription?: string
}

export class Schema extends GQLType<IResolvers> implements IGQLTypeDef {
  public complex: boolean = true
  /**
   * store Query entries after build
   */
  public get queries(): Array<Query> {
    return this._queries
  }
  /**
   * store Mutation entries after build
   */
  public get mutations(): Array<Mutation> {
    return this._mutations
  }

  /**
   * store Subscription entries after build
   */
  public get subscriptions(): Array<Subscription> {
    return this._subscriptions
  }
  /**
   * store all Items
   */
  public get items(): Array<GQLType> {
    return this._items
  }
  public get hooks(): Array<ResolverHook> {
    return [
      ...(this._hooks.length > 0 ? this._hooks : []),
      ...(this._isBuilt && this._compiledHooks && this._compiledHooks.length > 0
        ? this._compiledHooks
        : []),
    ]
  }
  /**
   * initial resolvers
   */
  public get resolvers(): IResolvers {
    return this._resolvers
  }
  public get isBuilt(): boolean {
    return this._isBuilt
  }

  public get valid(): boolean {
    return true
  }
  public get schema(): string {
    return this._isBuilt ? this._schema : ''
  }
  protected _compiledHooks!: Array<ResolverHook>
  protected _hooks: Array<ResolverHook> = []
  protected _resolversClean!: IResolvers
  protected _resolvers!: IResolvers
  /**
   * All entries for this schema
   * note: available after schema is built
   */
  protected _items: Array<GQLType> = []
  /**
   * All queries for schema
   * note: available after schema is built
   */
  /**
   * All queries for schema
   * note: available after schema is built
   */
  protected _queries!: Array<Query>
  /**
   * All mutations for schema
   * note: available after schema is built
   */
  /**
   * All mutations for schema
   * note: available after schema is built
   */
  protected _mutations!: Array<Mutation>
  /**
   * All subscriptions for schema.
   * note: available after schema is built
   */
  /**
   * All subscriptions for schema.
   * note: available after schema is built
   */
  protected _subscriptions!: Array<Subscription>
  /**
   * check is schema build
   */
  protected _isBuilt: boolean = false

  protected _initialSchema!: string

  protected _rootQuery?: string = 'Query'
  protected _rootMutation?: string = 'Mutation'
  protected _rootSubscription?: string = 'Subscription'

  /**
   * create item
   * @param inp the item must be
   */
  public create(inp: PossibleInitType): GQLType | Array<GQLType> | undefined {
    if (isValidInput(inp)) {
      return GQLType.create(inp)
    } else {
      return inp
    }
  }
  /**
   * add existing item to schema
   * @param inp
   */
  public add(inp: GQLType | Array<GQLType> | undefined) {
    if (Array.isArray(inp)) {
      return inp.map((i) => {
        return this.add(i)
      })
    } else if (inp) {
      if (this._items.indexOf(inp) === -1) {
        this._items.push(inp)
        return inp
      }
    }
  }

  /**
   * build schema
   */
  public build(force: boolean = false) {
    if (!this._isBuilt || force) {
      if (Array.isArray(this._items) && this._items.length > 0) {
        this._items
          .filter((i) => i instanceof Schema)
          .forEach((i) => (i as Schema).build())

        this._schema = mergeTypes(
          [...this._items.map((i) => i.schema), this._initialSchema].filter(
            (i) => i,
          ),
        )

        this._schemaAST = parse(this._schema)
        this._resolversClean = this._resolvers = merge(
          this._resolver,
          ...this._items
            .map((i) =>
              i instanceof Schema ? (i as Schema).resolvers : i.resolver,
            )
            .filter((i) => i),
        )

        this._compiledHooks = this._items
          .filter((r) => r.type === ModelType.schema)
          .map((r) => (r as Schema).hooks)
          .reduce((res, curr) => {
            res.push(...curr)
            return res
          }, [])
        this._isBuilt = true
      } else {
        this._resolversClean = this._resolvers = this._resolver
        this._isBuilt = true
      }
    }
  }
  /**
   * override inherited
   */
  public resolveName() {
    return ''
  }
  constructor(args: SchemaInput | string) {
    super(args)
    this._type = ModelType.schema
    if (args && typeof args === 'string') {
      this._name = args
    }
    if (args && typeof args !== 'string') {
      const {
        name,
        items,
        rootMutation,
        rootQuery,
        rootSubscription,
        hooks,
        schema,
      } = args
      if (schema) {
        this._initialSchema = this._schema
      }
      if (name) {
        this._name = name
      }
      if (rootMutation) {
        this._rootMutation = rootMutation
      }
      if (rootQuery) {
        this._rootQuery = rootQuery
      }
      if (rootSubscription) {
        this._rootSubscription = rootSubscription
      }
      if (items) {
        if (Array.isArray(items)) {
          items.forEach((item) => {
            this.add(this.create(item))
          })
        } else {
          this.add(this.create(items))
        }
      }
      if (hooks) {
        if (Array.isArray(hooks)) {
          this._hooks.push(...hooks)
        } else if (isResolverHook(hooks)) {
          this._hooks.push(hooks)
        }
      }
    }
    this.checkSchema()
  }

  public applyHooks() {
    const modelHooks = this.hooks
    for (let i = 0, len = modelHooks.length; i < len; i++) {
      const hookList = Object.keys(modelHooks[i])
      for (let j = 0, jLen = hookList.length; j < jLen; j++) {
        const key = hookList[j]
        const resoler = get(this.resolvers, key)
        set(this.resolvers, key, modelHooks[i][key](resoler as any))
      }
    }
  }
  public fixSchema() {
    this.attachSchema(_.cloneDeepWith(this._schemaAST, cloneCustomizer))
  }
}

const needToFix = (def: { kind: any }) =>
  def.kind === Kind.ENUM_TYPE_EXTENSION ||
  def.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.INTERFACE_TYPE_EXTENSION ||
  def.kind === Kind.OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.SCALAR_TYPE_EXTENSION ||
  def.kind === Kind.UNION_TYPE_EXTENSION

// optimize!!! it!!
function cloneCustomizer(value: { kind: string }) {
  if (value && value.kind && needToFix(value)) {
    return {
      ...value,
      kind: value.kind.replace(/Extension/i, 'Definition'),
    }
  } else if (value && value.kind && value.kind !== Kind.DOCUMENT) {
    return value
  }
}
