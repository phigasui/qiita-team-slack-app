/** @jsx JSXSlack.h */
import JSXSlack, { Input, Modal, Option, Section, Select, Textarea } from '@speee-js/jsx-slack'

export default ({ teams, default_team }: { teams: Array<string>, default_team?: string }) => {
  return JSXSlack(
    <Modal title="Qiita:Team Article" close="Cancel" callbackId="create_article">
      <Section>
        <p>記事を作成します。</p>
      </Section>

      <Select label="チームのURL" blockId="team" actionId="team" value={default_team} required>
        { teams.map(team_url_name =>
          <Option value={team_url_name}>{team_url_name}</Option>
        )}
      </Select>

      <Input label="タイトル" type="text" blockId="title" actionId="title" required />
      <Input label="タグ" type="text" blockId="tags" actionId="tags" placeholder="スペース区切りで複数登録 ex.'Ruby Rails'" />
      <Textarea label="本文" blockId="body" actionId="body" required />

      <Input type="submit" value="Save" />
    </Modal>
  )
}
