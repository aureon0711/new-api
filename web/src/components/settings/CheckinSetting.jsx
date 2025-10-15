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

import React, { useEffect, useState } from 'react';
import { API, showError, showSuccess } from '../../helpers';
import {
  Card,
  Switch,
  InputNumber,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Form,
  Row,
  Col,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const CheckinSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    checkin_enabled: false,
    checkin_min_quota: 0.01,
    checkin_max_quota: 0.01,
    checkin_code_enabled: false,
    checkin_code: '',
    consecutive_reward_enabled: false,
    consecutive_reward_quota: 0.01,
  });

  const getOptions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        const options = {};
        data.forEach((item) => {
          options[item.key] = item.value;
        });
        
        setFormData({
          checkin_enabled: options.checkin_enabled === 'true',
          checkin_min_quota: parseFloat(options.checkin_min_quota) || 0.01,
          checkin_max_quota: parseFloat(options.checkin_max_quota) || 0.01,
          checkin_code_enabled: options.checkin_code_enabled === 'true',
          checkin_code: options.checkin_code || '',
          consecutive_reward_enabled: options.consecutive_reward_enabled === 'true',
          consecutive_reward_quota: parseFloat(options.consecutive_reward_quota) || 0.01,
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

  const updateOption = async (key, value) => {
    try {
      const res = await API.put('/api/option/', {
        key,
        value,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('设置已保存'));
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('保存失败'));
    }
  };

  const handleSwitchChange = (key, checked) => {
    const newFormData = { ...formData, [key]: checked };
    setFormData(newFormData);
    updateOption(key, checked.toString());
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
      const updates = [
        { key: 'checkin_min_quota', value: formData.checkin_min_quota.toString() },
        { key: 'checkin_max_quota', value: formData.checkin_max_quota.toString() },
        { key: 'checkin_code', value: formData.checkin_code },
        { key: 'consecutive_reward_quota', value: formData.consecutive_reward_quota.toString() },
      ];

      for (const update of updates) {
        await updateOption(update.key, update.value);
      }
    } catch (error) {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOptions();
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
              checked={formData.checkin_enabled}
              onChange={(checked) => handleSwitchChange('checkin_enabled', checked)}
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
                value={formData.checkin_min_quota}
                onChange={(value) => handleNumberChange('checkin_min_quota', value)}
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%', marginTop: 8 }}
                disabled={!formData.checkin_enabled}
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
                value={formData.checkin_max_quota}
                onChange={(value) => handleNumberChange('checkin_max_quota', value)}
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%', marginTop: 8 }}
                disabled={!formData.checkin_enabled}
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
              disabled={!formData.checkin_enabled}
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
            disabled={!formData.checkin_enabled || !formData.checkin_code_enabled}
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
              disabled={!formData.checkin_enabled}
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
            disabled={!formData.checkin_enabled || !formData.consecutive_reward_enabled}
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
          <Button onClick={getOptions} loading={loading}>
            {t('重置')}
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default CheckinSetting;