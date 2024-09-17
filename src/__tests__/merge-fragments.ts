import gql from 'graphql-tag'
import mergeTypes from '../graphql-merge-schema'

const fragment1 = gql`
      fragment User on User {
        id
        name
      }
    `
const fragment2 = gql`
      fragment User on User {
        id
        someField
      }
    `
debugger
const schema = mergeTypes([fragment1, fragment2])

console.log(schema)

