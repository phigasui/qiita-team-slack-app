/** @jsx JSXSlack.h */
import JSXSlack, { Input, Modal, Option, Section, Select } from '@speee-js/jsx-slack'

export default ({ teams, default_team }: { teams: Array<string>, default_team?: string }) => {
  return JSXSlack(
    <Modal title="Qiita:Team Setting" close="Cancel" callbackId="update_setting">
      <Section>
        <p>連携するチームを選択してください</p>
      </Section>

      <Select label="チームのURL" blockId="team" actionId="team" value={default_team} required>
        { teams.map(team_url_name =>
          <Option value={team_url_name}>{team_url_name}</Option>
        )}
      </Select>

      <Input type="submit" value="Save" />
    </Modal>
  )
}
