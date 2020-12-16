import dotenv from 'dotenv'
import { App } from '@slack/bolt'
import request from 'request'

import MongoDBClient from './lib/MongoDBClient'
import { ArticleModal, RegistModal, SettingModal } from './Views'

dotenv.config()

const MONGODB_URL: string = process.env.MONGODB_URL || ''
const DB_NAME: string = process.env.DB_NAME || ''
const COLLECTION_NAME: string = 'tokens'

interface TokenRecord {
  slack_team_id: string
  slack_user_id: string
  qiita_api_token: string
  qiita_team_url_name?: string
}

interface TokenQuery {
  slack_team_id: string
  slack_user_id: string
}

interface TokenUpdateValues {
  qiita_api_token?: string
  qiita_team_url_name?: string
}

const saveToken = async (value: TokenRecord) => {
  const client = new MongoDBClient()
  await client.init(MONGODB_URL, DB_NAME, COLLECTION_NAME)
  const result = await client.insert(value)
  client.close()

  if (result == undefined) return false
  return result.insertedCount == 1 ? true : false
}

const fetchToken: (query: TokenQuery) => Promise<TokenRecord> = async (query: TokenQuery) => {
  const client = new MongoDBClient()
  await client.init(MONGODB_URL, DB_NAME, COLLECTION_NAME)
  const result = await client.find(query)
  client.close()

  return result
}

const updateToken = async (query: TokenQuery, value: TokenUpdateValues) => {
  const client = new MongoDBClient()
  await client.init(MONGODB_URL, DB_NAME, COLLECTION_NAME)
  const result = await client.update(query, value)
  client.close()

 if (result == undefined) return false
  return result.modifiedCount == 1 ? true : false
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})


interface Team {
  id: string
  name: string
  active: boolean
}

app.command('/qt_create_article', async ({ ack, command, context, payload, say }) => {
  ack()

  const token_record = await fetchToken({ slack_team_id: command.team_id, slack_user_id: command.user_id })

  if (!token_record) {
    say('Your token is not foun. Regist your token. Execute `/qt_regist_token` command.')

    return
  }

  const qiita_api_token = token_record.qiita_api_token
  const qiita_team_url_name = token_record.qiita_team_url_name

  const options = {
    uri: 'https://qiita.com/api/v2/teams',
    headers: {
      Authorization: `Bearer ${qiita_api_token}`,
      'Content-type': "application/json",
    },
  }

  await request.get(options, async (error, response, response_body) => {
    if (!error && response.statusCode == 200) {
      const teams = JSON.parse(response_body).map((team: Team) => team.active ? team.id : null).filter((id: string | null) => id != null)

      try {
        app.client.views.open({
          token: context.botToken,
          trigger_id: payload.trigger_id,
          view: ArticleModal({ teams: teams, default_team: qiita_team_url_name })
        })
      } catch (error) {
        console.log(error)
      }

    } else {
      console.log(response_body)

      app.client.chat.postMessage({
        token: context.botToken,
        channel: command.user_id,
        text: `Failed on request team: ${response_body.message}`
      })
    }
  })
})

app.command('/qt_edit_setting', async ({ ack, command, context, payload, say }) => {
  ack()

  const token_record = await fetchToken({ slack_team_id: command.team_id, slack_user_id: command.user_id })

  if (!token_record) {
    say('Your token is not foun. Regist your token. Execute `/qt_regist_token` command.')

    return
  }

  const qiita_api_token = token_record.qiita_api_token
  const qiita_team_url_name = token_record.qiita_team_url_name

  const options = {
    uri: 'https://qiita.com/api/v2/teams',
    headers: {
      Authorization: `Bearer ${qiita_api_token}`,
      'Content-type': "application/json",
    },
  }

  await request.get(options, async (error, response, response_body) => {
    if (!error && response.statusCode == 200) {
      const teams = JSON.parse(response_body).map((team: Team) => team.active ? team.id : null).filter((id: string | null) => id != null)

      try {
        app.client.views.open({
          token: context.botToken,
          trigger_id: payload.trigger_id,
          view: SettingModal({ teams: teams, default_team: qiita_team_url_name })
        })
      } catch (error) {
        console.log(error)
      }

    } else {
      console.log(response_body)

      app.client.chat.postMessage({
        token: context.botToken,
        channel: command.user_id,
        text: `Failed on request team: ${response_body.message}`
      })
    }
  })
})

app.command('/qt_regist_token', async ({ ack, context, payload }) => {
  ack()

  if (process.env.QIITA_CLIENT_ID == undefined) return console.log('QIITA_CLIENT_ID is required.')

  try {
    app.client.views.open({
      token: context.botToken,
      trigger_id: payload.trigger_id,
      view: RegistModal({ client_id: process.env.QIITA_CLIENT_ID })
    })
  } catch (error) {
    console.log(error)
  }
})

interface ArticleViewStateValues {
  values: {
    team: { team: { selected_option: { value: string } } }
    title: { title: { value: string } }
    tags: { tags: { value: string } }
    body: { body: { value: string } }
  }
}

const create_tag_objects = (tags: string) => {
  return tags.split(' ').map((tag_name) => {
    return { name: tag_name }
  })
}

app.view('create_article', async ({ ack, body, context, view }) => {
  ack()

  if (process.env.SLACK_BOT_TOKEN != context.botToken) return console.log('Invalid bot token.')
  if (process.env.QIITA_CLIENT_ID == undefined) return console.log('QIITA_CLIENT_ID is required.')
  if (process.env.QIITA_CLIENT_SECRET == undefined) return console.log('QIITA_CLIENT_SECRET is required.')

  const team_id: string = body.team.id
  const user_id: string = body.user.id

  const token_record = await fetchToken({ slack_team_id: team_id, slack_user_id: user_id })

  if (!token_record) {
    app.client.chat.postMessage({
      token: context.botToken,
      channel: user_id,
      text: 'Your token is not foun. Regist your token. Execute `/qt_regist_token` command.',
    })

    return
  }

  const qiita_api_token = token_record.qiita_api_token

  const article_view_state_values = (view.state as ArticleViewStateValues).values
  const qiita_team_url_name = article_view_state_values.team.team.selected_option.value
  const article_title = article_view_state_values.title.title.value
  const article_tags = article_view_state_values.tags.tags.value
  const article_body = article_view_state_values.body.body.value

  const options = {
    uri: `https://${qiita_team_url_name}.qiita.com/api/v2/items`,
    headers: {
      Authorization: `Bearer ${qiita_api_token}`,
      'Content-type': "application/json",
    },
    json: {
      client_id: process.env.QIITA_CLIENT_ID,
      client_secret: process.env.QIITA_CLIENT_SECRET,
      title: article_title,
      tags: create_tag_objects(article_tags),
      body: article_body,
    },
  }

  console.log(options)

  await request.post(options, async (error, response, response_body) => {
    console.log(response_body)

    let message: string
    if (!error && response.statusCode == 201) {
      message = `Created *${response_body.title}*:tada: ${response_body.url}`
    } else {
      console.log(response_body)
      message = `Creating Article Error: ${response_body.message}`
    }

    app.client.chat.postMessage({
      token: context.botToken,
      channel: user_id,
      text: message
    })
  })
})

interface SettingViewStateValue {
  values: {
    team: { team: { selected_option: { value: string } } }
  }
}

app.view('update_setting', async ({ ack, body, context, view }) => {
  ack()

  if (process.env.SLACK_BOT_TOKEN != context.botToken) return console.log('Invalid bot token.')
  if (process.env.QIITA_CLIENT_ID == undefined) return console.log('QIITA_CLIENT_ID is required.')
  if (process.env.QIITA_CLIENT_SECRET == undefined) return console.log('QIITA_CLIENT_SECRET is required.')

  const team_id: string = body.team.id
  const user_id: string = body.user.id

  const qiita_team_url_name = (view.state as SettingViewStateValue).values.team.team.selected_option.value

  let message: string
  if (await updateToken({ slack_team_id: team_id, slack_user_id: user_id }, { qiita_team_url_name: qiita_team_url_name })) {
    message = 'Updated team setting.'
  } else {
    message = 'Update Error'
  }

  app.client.chat.postMessage({
    token: context.botToken,
    channel: user_id,
    text: message
  })
})

interface RegistViewStateValue {
  values: {
    code: { code: { value: string } }
  }
}

app.view('regist_token', async ({ ack, body, context, view }) => {
  ack()

  if (process.env.SLACK_BOT_TOKEN != context.botToken) return console.log('Invalid bot token.')
  if (process.env.QIITA_CLIENT_ID == undefined) return console.log('QIITA_CLIENT_ID is required.')
  if (process.env.QIITA_CLIENT_SECRET == undefined) return console.log('QIITA_CLIENT_SECRET is required.')

  const team_id: string = body.team.id
  const user_id: string = body.user.id
  const code = (view.state as RegistViewStateValue).values.code.code.value

  const options = {
    uri: 'https://qiita.com/api/v2/access_tokens',
    headers: {
      'Content-type': "application/json",
    },
    json: {
      client_id: process.env.QIITA_CLIENT_ID,
      client_secret: process.env.QIITA_CLIENT_SECRET,
      code: code
    },
  }

  await request.post(options, async (error, response, response_body) => {
    let message: string
    if (!error && response.statusCode == 201 && await saveToken({ slack_team_id: team_id, slack_user_id: user_id, qiita_api_token: response_body.token })) {
      message = 'Registerd your Qiita API token:tada:'
    } else {
      console.log(response_body)
      message = `Regist Error: ${response_body.message}`
    }

    app.client.chat.postMessage({
      token: context.botToken,
      channel: user_id,
      text: message
    })
  })
})

const run = async () => {
  await app.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')
}

run()
