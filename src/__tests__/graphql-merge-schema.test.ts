import 'jest'
import gql from 'graphql-tag'
import mergeTypes from '../graphql-merge-schema'

describe('Merger', () => {
  it('merge classes', () => {
    const type1 = gql`
      type Query {
        login(user: String, password: String): Boolean @acl(level: ANONYMOUS)
      }
    `
    const directive = gql`
      directive @acl(
        level: [Acl] = [AUTHENTICATED]
      ) on OBJECT | FIELD_DEFINITION
    `
    const type2 = gql`
      type Query {
        logout(user: String): Boolean @acl(level: AUTHENTICATED)
      }
    `
    const schema = mergeTypes([type1, type2, directive])
    expect(schema).toMatchSnapshot('schema')
  })

  it('Merges UNIONS', () => {
    const Acl1 = gql`
      enum ACL {
        ADMIN
        AUTHENTICATED
      }
    `
    const Acl2 = gql`
      enum ACL {
        STUDENT
        EXAMINTOR
        VIEWER
      }
    `
    const schema = mergeTypes([Acl1, Acl2])
    expect(schema).toMatchSnapshot('snap')
  })
})
