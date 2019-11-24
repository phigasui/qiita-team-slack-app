/** @jsx JSXSlack.h */
import JSXSlack, { Input, Modal, Section } from '@speee-js/jsx-slack'

export default ({ client_id }: { client_id: string }) => {
  const authorize_url: string = `https://qiita.com/api/v2/oauth/authorize?client_id=${client_id}&response_type=code&scope=read_qiita_team+write_qiita_team`

  return JSXSlack(
    <Modal title="Qiita:Team Setting" close="Cancel" callbackId="regist_token">
      <Section>
        ご自身のアカウントとの連携設定をします。
        <ol>
          <li>
            <a href={authorize_url}>
              このリンクをクリックして
            </a>
            アプリの連携を承認してください。
          </li>
          <li>
            承認後にリダイレクトされたURL(https://teams.qiita.com/?code=[code])の *code* をコピーして、
            下記のフォームに入力してください。
          </li>
        </ol>
      </Section>

      <Input type="text" label="code" blockId="code" actionId="code" name="code" required />

      <Input type="submit" value="Save" />
    </Modal>
  )
}
