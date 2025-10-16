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

import { IconLink } from '@douyinfe/semi-icons';
import {
    Button,
    Card,
    Checkbox,
    Col,
    Modal,
    Row,
    Spin,
    Table,
    Tag,
    Typography
} from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Text } = Typography;

const ModelPermissionSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [userGroups, setUserGroups] = useState([]);
  const [enableGroups, setEnableGroups] = useState([]);
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentUserGroup, setCurrentUserGroup] = useState(null);
  const [selectedEnableGroups, setSelectedEnableGroups] = useState([]);

  // 加载用户组列表
  const loadUserGroups = async () => {
    try {
      // 使用后端的分页参数 p / page_size，并解析返回的 items
      const res = await API.get('/api/user_group?p=1&page_size=1000');
      const { success, message, data } = res.data;
      
      if (success) {
        const pageInfo = data || {};
        setUserGroups(pageInfo.items || []);
      } else {
        showError(message || t('加载用户组失败'));
      }
    } catch (error) {
      showError(t('加载用户组失败'));
    }
  };

  // 加载所有可用的 EnableGroup（从 Pricing 系统）
  const loadEnableGroups = async () => {
    try {
      const res = await API.get('/api/enable_group');
      const { success, message, data } = res.data;
      
      if (success) {
        setEnableGroups(data || []);
      } else {
        showError(message || t('加载模型分组失败'));
      }
    } catch (error) {
      showError(t('加载模型分组失败'));
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadUserGroups(), loadEnableGroups()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // 打开权限配置弹窗
  const openPermissionModal = async (userGroup) => {
    setCurrentUserGroup(userGroup);
    setShowPermissionModal(true);
    
    try {
      const res = await API.get(`/api/user_group/${userGroup.id}/enable_groups`);
      const { success, data } = res.data;
      
      if (success && data) {
        setSelectedEnableGroups(data);
      } else {
        setSelectedEnableGroups([]);
      }
    } catch (error) {
      showError(t('加载权限失败'));
      setSelectedEnableGroups([]);
    }
  };

  // 关闭权限配置弹窗
  const closePermissionModal = () => {
    setShowPermissionModal(false);
    setCurrentUserGroup(null);
    setSelectedEnableGroups([]);
  };

  // 保存权限配置
  const handleSavePermissions = async () => {
    if (!currentUserGroup) return;
    
    try {
      const res = await API.put(`/api/user_group/${currentUserGroup.id}/enable_groups`, {
        enable_groups: selectedEnableGroups,
      });
      
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('权限配置保存成功'));
        closePermissionModal();
      } else {
        showError(message || t('保存失败'));
      }
    } catch (error) {
      showError(t('保存失败'));
    }
  };

  // 复选框变更处理
  const handleCheckboxChange = (group, checked) => {
    if (checked) {
      setSelectedEnableGroups([...selectedEnableGroups, group]);
    } else {
      setSelectedEnableGroups(selectedEnableGroups.filter(g => g !== group));
    }
  };

  // 表格列定义
  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'id', 
      width: 80 
    },
    { 
      title: t('用户组名称'), 
      dataIndex: 'name', 
      width: 150, 
      render: (text) => <Text strong>{text}</Text> 
    },
    { 
      title: t('显示名称'), 
      dataIndex: 'display_name', 
      width: 150 
    },
    { 
      title: t('描述'), 
      dataIndex: 'description', 
      ellipsis: true, 
      render: (text) => <Text type="secondary">{text || '-'}</Text> 
    },
    {
      title: t('操作'),
      dataIndex: 'operate',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          theme="solid" 
          type="primary" 
          size="small" 
          icon={<IconLink />} 
          onClick={() => openPermissionModal(record)}
        >
          {t('配置权限')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
            {t('用户组模型权限管理')}
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            {t('为每个用户组配置可访问的模型分组。模型分组来自"分组与模型定价设置"中的配置。')}
          </Text>
        </div>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={userGroups} 
            rowKey="id" 
            pagination={false} 
          />
        </Spin>
      </Card>

      {/* 权限配置弹窗 */}
      <Modal 
        title={t('配置权限') + ' - ' + (currentUserGroup?.display_name || '')} 
        visible={showPermissionModal} 
        onCancel={closePermissionModal} 
        width={800} 
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={closePermissionModal}>{t('取消')}</Button>
            <Button theme="solid" type="primary" onClick={handleSavePermissions}>
              {t('保存')}
            </Button>
          </div>
        }
      >
        <Text strong style={{ display: 'block', marginBottom: '16px' }}>
          {t('请选择该用户组可以访问的模型分组：')}
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px', fontSize: '12px' }}>
          {t('提示：这些模型分组来自"分组与模型定价设置"。如需添加或修改模型分组，请前往该页面配置。')}
        </Text>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {enableGroups.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="tertiary">
                {t('暂无可用的模型分组。请先在"分组与模型定价设置"中配置模型分组。')}
              </Text>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {enableGroups.map(group => (
                <Col span={12} key={group}>
                  <Card style={{ padding: '12px' }}>
                    <Checkbox 
                      checked={selectedEnableGroups.includes(group)} 
                      onChange={(e) => handleCheckboxChange(group, e.target.checked)}
                    >
                      <div>
                        <Text strong>{group}</Text>
                        <Tag size="small" color="blue" style={{ marginLeft: '8px' }}>
                          {t('模型分组')}
                        </Tag>
                      </div>
                    </Checkbox>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ModelPermissionSetting;