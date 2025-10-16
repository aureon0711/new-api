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

import {
    Button,
    Card,
    Col,
    Divider,
    Input,
    InputNumber,
    Row,
    Space,
    Switch,
    Typography
} from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Title, Text } = Typography;

const CheckinSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    min_quota: 0.01,
    max_quota: 0.01,
    checkin_code_enabled: false,
    checkin_code: '',
    consecutive_reward_enabled: false,
    consecutive_reward_quota: 0.01,
  });

  const getConfig = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/checkin/config');
      const { success, message, data } = res.data;
      if (success) {
        setFormData({
          enabled: data?.enabled ?? false,
          min_quota: data?.min_quota ?? 0.01,
          max_quota: data?.max_quota ?? 0.01,
          checkin_code_enabled: data?.checkin_code_enabled ?? false,
          checkin_code: data?.checkin_code ?? '',
          consecutive_reward_enabled: data?.consecutive_reward_enabled ?? false,
          consecutive_reward_quota: data?.consecutive_reward_quota ?? 0.01,
        });
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchChange = (key, checked) => {
    const newFormData = { ...formData, [key]: checked };
    setFormData(newFormData);
  };

  const handleInputChange = (key, value) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
  };

  const handleNumberChange = (key, value) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        enabled: formData.enabled,
        min_quota: Number(formData.min_quota) || 0,
        max_quota: Number(formData.max_quota) || 0,
        checkin_code_enabled: formData.checkin_code_enabled,
        checkin_code: formData.checkin_code || '',
        consecutive_reward_enabled: formData.consecutive_reward_enabled,
        consecutive_reward_quota: Number(formData.consecutive_reward_quota) || 0,
      };
      const res = await API.put('/api/checkin/config', payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('设置已保存'));
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getConfig();
  }, []);

  return (
    <div className='space-y-6'>
      <Card>
        <Title heading={4}>{t('签到功能设置')}</Title>
        <Text type='secondary'>{t('配置每日签到功能的相关参数')}</Text>
      </Card>

      <Card>
        <Title heading={5}>{t('基本设置')}</Title>
        
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <div>
              <Text strong>{t('启用签到功能')}</Text>
              <br />
              <Text type='secondary' size='small'>
                {t('开启后用户可以进行每日签到')}
              </Text>
            </div>
            <Switch
              checked={formData.enabled}
              onChange={(checked) => handleSwitchChange('enabled', checked)}
            />
          </div>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <div>
                <Text strong>{t('最小签到额度')}</Text>
                <br />
                <Text type='secondary' size='small'>
                  {t('用户签到时获得的最小额度（美元）')}
                </Text>
              </div>
              <InputNumber
                value={formData.min_quota}
                onChange={(value) => handleNumberChange('min_quota', value)}
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%', marginTop: 8 }}
                disabled={!formData.enabled}
              />
            </Col>
            <Col span={12}>
              <div>
                <Text strong>{t('最大签到额度')}</Text>
                <br />
                <Text type='secondary' size='small'>
                  {t('用户签到时获得的最大额度（美元），不设置则使用最小值')}
                </Text>
              </div>
              <InputNumber
                value={formData.max_quota}
                onChange={(value) => handleNumberChange('max_quota', value)}
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%', marginTop: 8 }}
                disabled={!formData.enabled}
              />
            </Col>
          </Row>
        </div>
      </Card>

      <Card>
        <Title heading={5}>{t('签到码设置')}</Title>
        
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <div>
              <Text strong>{t('启用签到码')}</Text>
              <br />
              <Text type='secondary' size='small'>
                {t('开启后用户可以使用签到码进行签到')}
              </Text>
            </div>
            <Switch
              checked={formData.checkin_code_enabled}
              onChange={(checked) => handleSwitchChange('checkin_code_enabled', checked)}
              disabled={!formData.enabled}
            />
          </div>

          <div>
            <Text strong>{t('签到码')}</Text>
            <br />
            <Text type='secondary' size='small'>
              {t('设置签到码，用户可以使用此码进行签到')}
            </Text>
          </div>
          <Input
            value={formData.checkin_code}
            onChange={(value) => handleInputChange('checkin_code', value)}
            placeholder={t('请输入签到码')}
            disabled={!formData.enabled || !formData.checkin_code_enabled}
          />
        </div>
      </Card>

      <Card>
        <Title heading={5}>{t('连续签到奖励')}</Title>
        
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <div>
              <Text strong>{t('启用连续签到奖励')}</Text>
              <br />
              <Text type='secondary' size='small'>
                {t('开启后连续签到的用户可以获得额外奖励')}
              </Text>
            </div>
            <Switch
              checked={formData.consecutive_reward_enabled}
              onChange={(checked) => handleSwitchChange('consecutive_reward_enabled', checked)}
              disabled={!formData.enabled}
            />
          </div>

          <div>
            <Text strong>{t('连续签到奖励额度')}</Text>
            <br />
            <Text type='secondary' size='small'>
              {t('连续签到每天额外获得的额度（美元）')}
            </Text>
          </div>
          <InputNumber
            value={formData.consecutive_reward_quota}
            onChange={(value) => handleNumberChange('consecutive_reward_quota', value)}
            min={0}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            disabled={!formData.enabled || !formData.consecutive_reward_enabled}
          />
        </div>
      </Card>

      <Card>
        <Space>
          <Button
            type='primary'
            onClick={handleSubmit}
            loading={loading}
          >
            {t('保存设置')}
          </Button>
          <Button onClick={getConfig} loading={loading}>
            {t('重置')}
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default CheckinSetting;