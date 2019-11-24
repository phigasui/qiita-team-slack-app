import mongodb from 'mongodb'

export default class {
  public client: mongodb.MongoClient | undefined
  public db: mongodb.Db | undefined
  public collection: mongodb.Collection | undefined

  constructor() {
    this.client = undefined
    this.db = undefined
    this.collection = undefined
  }

  public async init(mongodb_url: string, db_name: string, collection_name: string) {
    this.client = await mongodb.MongoClient.connect(mongodb_url, { useUnifiedTopology: true })
    this.db = this.client.db(db_name)
    this.collection = this.db.collection(collection_name)
  }

  public async find(query: {}) {
    if (this.collection == undefined) {
      return
    }

    return await this.collection.findOne(query)
  }

  public async insert(value: {}) {
    if (this.collection == undefined) {
      return
    }

    return await this.collection.insertOne(value)
  }

  public async update(query: {}, value: {}) {
    if (this.collection == undefined) {
      return
    }

    return await this.collection.updateOne(query, { $set: { ...query, ...value } })
  }

  public close() {
    if (this.client == undefined) {
      return
    }

    this.client.close()
  }
}
