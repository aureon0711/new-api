/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState } from 'react';
import { Tabs, TabPane } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { Users, UserCog } from 'lucide-react';
import UserGroupBasicSetting from './UserGroupBasicSetting';
import UserGroupAssignSetting from './UserGroupAssignSetting';

const UserGroupSetting = () => {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('basic');

  return (
    <div>
      <Tabs
        type="line"
        activeKey={activeKey}
        onChange={(key) => setActiveKey(key)}
      >
        <TabPane
          tab={
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={16} />
              {t('创建用户组')}
            </span>
          }
          itemKey="basic"
        >
          {activeKey === 'basic' && <UserGroupBasicSetting />}
        </TabPane>
        <TabPane
          tab={
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <UserCog size={16} />
              {t('分配用户组')}
            </span>
          }
          itemKey="assign"
        >
          {activeKey === 'assign' && <UserGroupAssignSetting />}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default UserGroupSetting;