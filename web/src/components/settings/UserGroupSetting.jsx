
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
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  TextArea,
  Select,
  Tag,
  Space,
  Popconfirm,
  Card,
  Spin,
  Checkbox,
  CheckboxGroup,
  Typography,
  Divider,
  Row,
  Col,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { IconEdit, IconDelete, IconPlus, IconSearch } from '@douyinfe/semi-icons';

const { Text } = Typography;

const UserGroupSetting = () => {
  const { t } = useTranslation();
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 10, total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [formApi, setFormApi] = useState(null);
  const [enableGroups, setEnableGroups] = useState([]);
  const [selectedEnableGroups, setSelectedEnableGroups] = useState([]);

  // 加载用户组列表
  const loadUserGroups = async (page = 1, size = 10, keyword = '') => {
    setLoading(true);
    try {
      let url = `/api/user_group?page=${page}&size=${size}`;
      if (keyword && keyword.trim()) {
        url = `/api/user_group/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`;
      }
      const res = await API.get(url);
      if (res.data.success) {
        setUserGroups(res.data.data.data || []);
        setPagination({ currentPage: page, pageSize: size, total: res.data.data.total });
      } else {
        showError(res.data.message || t('加载失败'));
      }
    } catch (error) {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  // 加载所有可用的模型分组
  const loadEnableGroups = async () => {
    try {
      const res = await API.get('/api/enable_group');
      if (res.data.success) {
        setEnableGroups(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load enable groups:', error);
    }
  };

  useEffect(() => {
    loadUserGroups();
    loadEnableGroups();
  }, []);

  // 打开编辑/创建弹窗
  const handleEdit = async (record) => {
    setEditingGroup(record);
    setModalVisible(true);
    
    if (record) {
      // 加载用户组的模型权限
      try {
        const res = await API.get(`/api/user_group/${record.id}/enable_groups`);
        if (res.data.success && res.data.data) {
          setSelectedEnableGroups(res.data.data);
        } else {
          setSelectedEnableGroups([]);
        }
      } catch (error) {
        setSelectedEnableGroups([]);
      }

      if (formApi) {
        // 解析config中的登录方式配置
        let loginMethods = [];
        try {
          if (record.config) {
            const config = JSON.parse(record.config);
            if (config.auto_assign_rules && Array.isArray(config.auto_assign_rules)) {
              loginMethods = config.auto_assign_rules
                .filter(rule => rule.enabled)
                .map(rule => rule.type);
            }
          }
        } catch (e) {
          console.error('Failed to parse config:', e);
        }

        formApi.setValues({
          name: record.name,
          display_name: record.display_name,
          description: record.description,
          login_methods: loginMethods,
          status: record.status,
        });
      }
    } else {
      setSelectedEnableGroups([]);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingGroup(null);
    setSelectedEnableGroups([]);
    if (formApi) {
      formApi.reset();
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      // 构建config对象
      const config = {
        auto_assign_rules: (values.login_methods || []).map(type => ({
          type: type,
          enabled: true,
          priority: 1,
        })),
      };

      const payload = {
        name: values.name,
        display_name: values.display_name,
        description: values.description || '',
        config: JSON.stringify(config),
        status: values.status || 1,
      };

      let res;
      let groupId;
      
      if (editingGroup) {
        payload.id = editingGroup.id;
        groupId = editingGroup.id;
        res = await API.put('/api/user_group', payload);
      } else {
        res = await API.post('/api/user_group', payload);
        if (res.data.success && res.data.data) {
          groupId = res.data.data.id;
        }
      }

      const { success, message } = res.data;
      if (success) {
        // 更新模型权限
        if (groupId && selectedEnableGroups.length > 0) {
          try {
            await API.put(`/api/user_group/${groupId}/enable_groups`, {
              enable_groups: selectedEnableGroups,
            });
          } catch (error) {
            console.error('Failed to update enable groups:', error);
          }
        }
        
        showSuccess(editingGroup ? t('更新成功') : t('创建成功'));
        handleCloseModal();
        loadUserGroups(pagination.currentPage, pagination.pageSize, searchKeyword);
      } else {
        showError(message || t('操作失败'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      showError(t('操作失败'));
    }
  };

  // 删除用户组
  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/user_group/${id}`);
      const { success, message } = res.data;
      
      if (success) {
        showSuccess(t('删除成功'));
        loadUserGroups(pagination.currentPage, pagination.pageSize, searchKeyword);
      } else {
        showError(message || t('删除失败'));
      }
    } catch (error) {
      showError(t('删除失败'));
    }
  };

  // 搜索
  const handleSearch = () => {
    setPagination({ ...pagination, currentPage: 1 });
    loadUserGroups(1, pagination.pageSize, searchKeyword);
  };

  // 分页变更
  const handlePageChange = (page) => {
    loadUserGroups(page, pagination.pageSize, searchKeyword);
  };

  // 登录方式选项
  const loginMethodOptions = [
    { label: t('GitHub登录'), value: 'github' },
    { label: t('邮箱登录'), value: 'email' },
    { label: t('Discord登录'), value: 'discord' },
    { label: t('Telegram登录'), value: 'telegram' },
    { label: t('微信登录'), value: 'wechat' },
    { label: t('OIDC登录'), value: 'oidc' },
    { label: t('LinuxDo登录'), value: 'linuxdo' },
  ];

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: t('名称'), dataIndex: 'name' },
    { title: t('显示名称'), dataIndex: 'display_name' },
    { title: t('描述'), dataIndex: 'description' },
    { 
      title: t('状态'), 
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? t('启用') : t('禁用')}
        </Tag>
      )
    },
    {
      title: t('操作'),
      render: (_, record) => (
        <Space>
          <Button 
            theme="borderless" 
            type="primary" 
            size="small" 
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
          >
            {t('编辑')}
          </Button>
          <Popconfirm
            title={t('确定删除此用户组吗？')}
            content={t('此操作不可恢复')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('确定')}
            cancelText={t('取消')}
          >
            <Button 
              theme="borderless" 
              type="danger" 
              size="small" 
              icon={<IconDelete />}
            >
              {t('删除')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            prefix={<IconSearch />}
            placeholder={t('搜索用户组')}
            value={searchKeyword}
            onChange={(value) => setSearchKeyword(value)}
            onEnterPress={handleSearch}
            style={{ width: 300 }}
          />
          <Button onClick={handleSearch}>{t('搜索')}</Button>
          <Button 
            theme="solid" 
            type="primary" 
            icon={<IconPlus />}
            onClick={() => setModalVisible(true)}
          >
            {t('创建用户组')}
          </Button>
        </Space>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={userGroups}
            pagination={{
              currentPage: pagination.currentPage,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50, 100],
              onPageChange: handlePageChange,
              onPageSizeChange: (size) => {
                setPagination({ ...pagination, pageSize: size, currentPage: 1 });
                loadUserGroups(1, size, searchKeyword);
              }
            }}
            rowKey="id"
          />
        </Spin>
      </Card>

      {/* 创建/编辑Modal */}
      <Modal
        title={editingGroup ? t('编辑用户组') : t('创建用户组')}
        visible={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        <Form 
          getFormApi={(api) => setFormApi(api)} 
          onSubmit={handleSubmit} 
          labelPosition="left" 
          labelWidth={120}
          initValues={{ status: 1, login_methods: [] }}
        >
          <Form.Input 
            field="name" 
            label={t('名称')} 
            placeholder={t('例如：github_users')}
            rules={[{ required: true, message: t('请输入名称') }]}
            extraText={t('用户组的标识名称')}
          />
          <Form.Input 
            field="display_name" 
            label={t('显示名称')} 
            placeholder={t('例如：GitHub用户组')}
            rules={[{ required: true, message: t('请输入显示名称') }]}
          />
          <Form.TextArea 
            field="description" 
            label={t('描述')} 
            placeholder={t('用户组的详细描述')}
            rows={3}
          />
          
          <Divider margin="24px" />
          
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: '14px' }}>{t('注册/登录方式配置')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('选择使用该登录方式注册的用户自动分配到此用户组')}
            </Text>
          </div>
          
          <Form.CheckboxGroup 
            field="login_methods"
            direction="vertical"
          >
            {loginMethodOptions.map(option => (
              <Checkbox key={option.value} value={option.value}>
                {option.label}
              </Checkbox>
            ))}
          </Form.CheckboxGroup>

          <Divider margin="24px" />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: '14px' }}>{t('模型权限配置')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('选择该用户组可以访问的模型分组（来自分组与模型定价设置）')}
            </Text>
          </div>

          {enableGroups.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '20px', marginBottom: 16 }}>
              <Text type="tertiary">
                {t('暂无可用的模型分组。请先在"分组与模型定价设置"中配置模型分组。')}
              </Text>
            </Card>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: 16 }}>
              <Row gutter={[12, 12]}>
                {enableGroups.map(group => (
                  <Col span={12} key={group}>
                    <Card 
                      style={{ 
                        padding: '8px 12px',
                        cursor: 'pointer',
                        border: selectedEnableGroups.includes(group) 
                          ? '2px solid var(--semi-color-primary)' 
                          : '1px solid var(--semi-color-border)'
                      }}
                      onClick={() => {
                        if (selectedEnableGroups.includes(group)) {
                          setSelectedEnableGroups(selectedEnableGroups.filter(g => g !== group));
                        } else {
                          setSelectedEnableGroups([...selectedEnableGroups, group]);
                        }
                      }}
                    >
                      <Checkbox 
                        checked={selectedEnableGroups.includes(group)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEnableGroups([...selectedEnableGroups, group]);
                          } else {
                            setSelectedEnableGroups(selectedEnableGroups.filter(g => g !== group));
                          }
                        }}
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
            </div>
          )}

          <Divider margin="24px" />

          <Form.RadioGroup 
            field="status" 
            label={t('状态')} 
            rules={[{ required: true }]}
          >
            <Form.Radio value={1}>{t('启用')}</Form.Radio>
            <Form.Radio value={0}>{t('禁用')}</Form.Radio>
          </Form.RadioGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button onClick={handleCloseModal}>{t('取消')}</Button>
            <Button theme="solid" type="primary" htmlType="submit">
              {editingGroup ? t('更新') : t('创建')}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserGroupSetting;