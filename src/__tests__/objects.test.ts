import 'jest'
import { Enum, Query, GQLType, Schema, Type, Mutation, Union } from './..'
import gql from 'graphql-tag'
import { makeExecutableSchema } from 'graphql-tools'
import { execute } from 'graphql'

describe('Enum', () => {
  it('parse name from schema as ast', () => {
    const item = new Enum({
      schema: gql`
        enum colors {
          Red
          black
          green
        }
      `,
    })
    expect(item.name).toBe('colors')
  })
  it('parse name from schema as string', () => {
    const item = new Enum({
      schema: `
        enum colors {
          Red
          black
          green
        }
      `,
    })
    expect(item.name).toBe('colors')
  })
})

describe('Query', () => {
  it('not throws to create with wrong schema', () => {
    const query = new Query('user(id: String): String')
    expect(query.valid).toBe(false)
    expect(query.name).toBe(undefined)
    expect(query.schema).toBe(undefined)
    expect(query.resolver).toBe(undefined)
  })

  it('not throws to create with right schema', () => {
    const query = new Query(gql`
      extend type Query {
        user(id: String): String
      }
    `)
    expect(query.valid).toBe(true)
    expect(query.name).toBe('user')
    expect(query.resolver).toBe(undefined)
  })
})

describe('GQLType', () => {
  it('creates Query', () => {
    const item = GQLType.create(gql`
      extend type Query {
        user(id: String): String
      }
    `)
    expect(item[0].type).toBe('query')
    expect(item[0].name).toBe('user')
  })
  it('creates Mutation', () => {
    const item = GQLType.create(gql`
      extend type Mutation {
        updateUser(id: String, payload: UserPayload): String
      }
    `)
    expect(item[0].type).toBe('mutation')
    expect(item[0].name).toBe('updateUser')
  })
  it('creates Type', () => {
    const item = GQLType.create(gql`
      extend type Picture {
        name: String
        size: ImageSize
      }
    `)
    expect(item[0].type).toBe('type')
    expect(item[0].name).toBe('Picture')
    expect(item[0].isExtend).toBeTruthy()
  })
})

describe('Schema', () => {
  it('created from string name', () => {
    const res = new Schema('Person')
    expect(res).not.toBeUndefined()
    expect(res.name).toBe('Person')
  })
  it('created from string name', () => {
    const res = new Schema({
      name: 'Person',
    })
    expect(res).not.toBeUndefined()
    expect(res.name).toBe('Person')
  })
  it('created from SchemaInput with items', () => {
    const res = new Schema({
      name: 'Person',
      items: [
        gql`
          extend type Mutation {
            updateUser(id: String, payload: UserPayload): String
          }
        `,
        `
        extend type Mutation {
          deleteUser(id: String, payload: UserPayload): String
        }
      `,
        new Type(gql`
          extend type Picture {
            name: String
            size: ImageSize
          }
        `),
      ],
    })
    expect(res).not.toBeUndefined()
    expect(res.name).toBe('Person')
    expect(res.items.length).toBe(3)
  })
  it('created from one graphQl', () => {
    const res = new Schema({
      name: 'Person',
      items: [
        gql`
          schema {
            query: Query
            mutation: Mutation
          }
          extend type Mutation {
            updateUser(id: String, payload: UserPayload): String
          }
          extend type Mutation {
            deleteUser(id: String, payload: UserPayload): String
          }
          type Image {
            name: String
            size: ImageSize
          }

          type Viewer {
            username: String
          }

          extend type Mutation {
            login(user: String): String
          }
          extend type Query {
            viewer(user: String): Viewer
          }
        `,
        new Schema({
          name: 'Picture',
          items: [
            new Type({
              schema: gql`
                type Picture {
                  name: String
                  size: ImageSize
                }
              `,
              resolver: {
                size: () => null,
              },
            }),
          ],
          schema: gql`
            extend type Mutation {
              createPicture: String
            }
            extend type Picture {
              isJPG: ImageSize
            }
          `,
          resolver: {
            Mutation: {
              createPicture: () => null,
            },
            Picture: {
              isJPG: () => true,
            },
          },
        }),
      ],
      resolver: {
        Mutation: {
          login: () => null,
          deleteUser: () => null,
          updateUser: () => null,
        },
        Query: {
          viewer: () => null,
        },
        Viewer: () => ({
          username: 'system',
        }),
      },
    })
    expect(res).not.toBeUndefined()
    expect(res.name).toBe('Person')
    expect(res.items.length).toBe(7)
    res.build()
    res.fixSchema()
    expect(res.isBuilt).toBeTruthy()
    expect(res.resolvers).toMatchSnapshot()
    expect(res.schema).toMatchSnapshot()
    expect(res.schemaAST).toMatchSnapshot()
  })
})

describe('Merge', () => {
  it('throws when too many types', () => {
    expect(
      () =>
        new Type({
          schema: gql`
            directive @example on FIELD_DEFINITION | ARGUMENT_DEFINITION
            type Picture implements Node {
              name: String @example
              size(name: String @example): ImageSize
            }
          `,
          resolver: {
            size: () => null,
          },
        }),
    ).toThrow()
  })

  it('merge-schema', () => {
    const res = new Schema({
      name: 'Person',
      items: [
        gql`
          schema {
            query: Query
            mutation: Mutation
          }
          directive @example on FIELD
          interface Node {
            id: ID!
          }
          extend type Mutation {
            updateUser(id: String, payload: UserPayload): String
          }
          extend type Mutation {
            deleteUser(id: String, payload: UserPayload): String
          }
          union Images = Image
          type Image implements Node {
            name: String
            size: ImageSize
          }

          type Viewer {
            username: String
          }

          extend type Mutation {
            login(user: String): String
          }
          extend type Query {
            viewer(user: String): Viewer
          }
        `,
        new Schema({
          name: 'Picture',
          items: [
            new Type({
              schema: gql`
                type Picture implements Node {
                  name: String @example
                  size(name: String @example): ImageSize
                }
              `,
              resolver: {
                size: () => 1,
              },
            }),
          ],
          schema: gql`
            directive @example on FIELD_DEFINITION | ARGUMENT_DEFINITION
            union Images = Picture
            schema {
              mutation: Mutation
            }
            type Viewer {
              username(short: Boolean): String
            }
            extend type Mutation {
              createPicture: String
            }
            interface INode {
              id: ID!
            }
            extend type Picture implements INode {
              isJPG: ImageSize
            }
          `,
          resolver: {
            Mutation: {
              createPicture: () => null,
            },
            Picture: {
              isJPG: () => true,
            },
          },
        }),
      ],
      resolver: {
        Mutation: {
          login: () => null,
          deleteUser: () => null,
          updateUser: () => null,
        },
        Query: {
          viewer: () => null,
        },
        Viewer: () => ({
          username: 'system',
        }),
      },
    })
    res.build()
    res.fixSchema()
    expect(res.schema).toMatchSnapshot()
  })
  it('override__resolvers', async () => {
    const res = new Schema({
      name: 'Person',
      items: [
        new Union({
          schema: gql`
            union Images = Image
          `,
          resolver: () => {
            return 'Picture'
          },
        }),
        gql`
          schema {
            query: Query
            mutation: Mutation
          }
          input UserPayload {
            name: String
            password: String
          }
          directive @example on FIELD
          interface INode {
            id: ID!
          }
          extend type Mutation {
            updateUser(id: String, payload: UserPayload): String
          }
          extend type Mutation {
            deleteUser(id: String, payload: UserPayload): String
          }
          type Image implements INode {
            id: ID!
            name: String
            size: ImageSize
          }
          extend type Query {
            images: [Image]
          }
          type Viewer {
            username: String
          }

          extend type Mutation {
            login(user: String): String
          }
          extend type Query {
            viewer(user: String): Viewer
          }
        `,
        new Schema({
          name: 'Picture',
          items: [
            new Type({
              schema: gql`
                type Picture implements INode {
                  id: ID!
                  name: String @example
                  size(name: String @example): ImageSize
                }
              `,
              resolver: {
                size: () => 1,
              },
            }),
          ],
          schema: gql`
            directive @example on FIELD_DEFINITION | ARGUMENT_DEFINITION
            union Images = Picture
            enum ImageSize {
              jpg
              gif
            }
            schema {
              mutation: Mutation
              query: Query
            }
            type Viewer {
              username(short: Boolean): String
            }
            extend type Mutation {
              createPicture: Picture
            }
            interface INode {
              id: ID!
            }
            extend type Picture implements INode {
              id: ID!
              isJPG: ImageSize
            }
          `,
          resolver: {
            Mutation: {
              createPicture: () => ({
                id: 'Images',
                name: 'cool',
              }),
            },
            Picture: {
              isJPG: () => 'jpg',
            },
          },
        }),
        new Mutation({
          schema: gql`
            extend type Mutation {
              createPicture: Images
            }
          `,
          resolver: () => ({
            id: 'coolPicture',
            name: 'cool',
          }),
        }),
      ],
      resolver: {
        Mutation: {
          login: () => null,
          deleteUser: () => null,
          updateUser: () => null,
        },
        Query: {
          viewer: () => null,
        },
        Viewer: () => ({
          username: 'system',
        }),
      },
    })
    res.build()
    res.fixSchema()
    const _schema = makeExecutableSchema({
      typeDefs: res.schema,
      resolvers: res.resolvers,
    })
    const result = await execute({
      schema: _schema,
      document: gql`
        mutation create {
          createPicture {
            ... on Picture {
              isJPG
              name
              id
            }
            ... on Image {
              id
              name
              size
            }
          }
        }
      `,
    })

    expect(res.schema).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })
  it('defines Schema using new Schema function', () => {
    const schema = new Schema({
      name: 'Person.mutation.create.safe',
      schema: gql`
        extend type Mutation {
          createManyPersonSafe(name: [String]): [String]
          createPersonSafe(input: String!): String
        }
      `,
      resolver: {
        Mutation: {
          createManyPersonSafe: () => {
            return 'create.many.safe'
          },
          createPersonSafe: () => {
            return 'create.many.safe'
          },
        },
      },
    })

    const schema2 = new Schema({
      name: 'Person.mutation',
      items: [schema],
    })
    schema2.build()
    expect(schema.isBuilt).toBeTruthy()
    expect(schema).toMatchSnapshot()
  })
})
