import gql from 'graphql-tag'
import { GQLType, Query } from '..'

// const query = new Query('user(id: String): String')

const item = GQLType.create(gql`
      extend type Picture {
        name: String
        size: ImageSize
      }
    `)

console.log(item[0].type)
console.log(item[0].name)
console.log(item[0].isExtend)