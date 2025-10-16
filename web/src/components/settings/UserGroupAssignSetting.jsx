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

import { IconSave } from '@douyinfe/semi-icons';
import {
  Button,
  Card,
  Form,
  Spin,
  Typography
} from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Text } = Typography;

const UserGroupAssignSetting = () => {
  const { t } = useTranslation();
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formApi, setFormApi] = useState(null);

  // 登录方式配置
  const loginMethods = [
    { key: 'UserGroupForGitHub', label: 'GitHub登录', description: '使用GitHub OAuth登录的用户' },
    { key: 'UserGroupForEmail', label: '邮箱登录', description: '使用邮箱验证码登录的用户' },
    { key: 'UserGroupForPassword', label: '密码注册', description: '使用用户名密码注册的用户' },
    { key: 'UserGroupForDiscord', label: 'Discord登录', description: '使用Discord OAuth登录的用户' },
    { key: 'UserGroupForTelegram', label: 'Telegram登录', description: '使用Telegram登录的用户' },
    { key: 'UserGroupForWeChat', label: '微信登录', description: '使用微信登录的用户' },
    { key: 'UserGroupForOIDC', label: 'OIDC登录', description: '使用OIDC登录的用户' },
    { key: 'UserGroupForLinuxDO', label: 'LinuxDO登录', description: '使用LinuxDO登录的用户' },
  ];

  // 加载用户组列表
  const loadUserGroups = async () => {
    try {
      // 后端分页参数为 p / page_size，返回字段为 items
      const res = await API.get('/api/user_group?p=1&page_size=1000');
      if (res.data.success) {
        const pageInfo = res.data.data || {};
        const groups = pageInfo.items || [];
        const options = groups.map((g) => ({
          label: `${g.display_name} (${g.name})`,
          value: g.name,
        }));
        setUserGroups(options);
      } else {
        showError(res.data.message || t('加载用户组失败'));
      }
    } catch (error) {
      showError(t('加载用户组失败'));
    }
  };

  // 加载当前配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      if (res.data.success) {
        const options = res.data.data;
        const config = {};
        loginMethods.forEach(method => {
          config[method.key] = options[method.key] || 'default';
        });
        formApi?.setValues(config);
      } else {
        showError(res.data.message || t('加载配置失败'));
      }
    } catch (error) {
      showError(t('加载配置失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserGroups();
  }, []);

  useEffect(() => {
    if (formApi && userGroups.length > 0) {
      loadConfig();
    }
  }, [formApi, userGroups]);

  // 保存配置
  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      // 批量更新配置
      const promises = Object.keys(values).map(key => 
        API.put('/api/option/', {
          key: key,
          value: values[key]
        })
      );
      
      await Promise.all(promises);
      showSuccess(t('保存成功'));
    } catch (error) {
      showError(t('保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
            {t('用户组自动分配配置')}
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            为不同的登录/注册方式配置默认用户组。新注册的用户将自动分配到对应的用户组。
          </Text>
          <Text type="warning" style={{ display: 'block', fontSize: '13px' }}>
            ⚠️ 注意：修改配置只对新注册用户生效，已有用户不受影响。
          </Text>
        </div>

        <Spin spinning={loading}>
          <Form
            getFormApi={setFormApi}
            onSubmit={handleSubmit}
            labelPosition="left"
            labelWidth={180}
            style={{ maxWidth: 800 }}
          >
            {loginMethods.map(method => (
              <Form.Select
                key={method.key}
                field={method.key}
                label={method.label}
                placeholder={t('选择用户组')}
                optionList={userGroups}
                style={{ width: '100%' }}
                rules={[{ required: true, message: t('请选择用户组') }]}
                extraText={method.description}
              />
            ))}

            <div style={{ marginTop: 24 }}>
              <Button
                theme="solid"
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<IconSave />}
                style={{ marginRight: 8 }}
              >
                {t('保存配置')}
              </Button>
              <Button
                onClick={() => formApi?.reset()}
                disabled={saving}
              >
                {t('重置')}
              </Button>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default UserGroupAssignSetting;