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

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  TextArea,
  Popconfirm,
  Space,
  Tag,
  Typography,
  Spin,
  Tabs,
  TabPane,
  Checkbox,
  Row,
  Col,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconDelete, IconPlus, IconSearch, IconLink } from '@douyinfe/semi-icons';

const { Text } = Typography;

const ModelPermissionSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('model_groups');
  
  const [modelGroups, setModelGroups] = useState([]);
  const [modelGroupsTotal, setModelGroupsTotal] = useState(0);
  const [modelGroupsPage, setModelGroupsPage] = useState(1);
  const [modelGroupsPageSize, setModelGroupsPageSize] = useState(10);
  const [modelGroupsKeyword, setModelGroupsKeyword] = useState('');
  
  const [userGroups, setUserGroups] = useState([]);
  
  const [showModelGroupModal, setShowModelGroupModal] = useState(false);
  const [editingModelGroup, setEditingModelGroup] = useState(null);
  const [modelGroupFormApi, setModelGroupFormApi] = useState(null);
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentUserGroup, setCurrentUserGroup] = useState(null);
  const [selectedModelGroups, setSelectedModelGroups] = useState([]);

  const loadModelGroups = async (page = modelGroupsPage, size = modelGroupsPageSize, keyword = modelGroupsKeyword) => {
    setLoading(true);
    try {
      let url = `/api/model_group?page=${page}&size=${size}`;
      if (keyword && keyword.trim()) {
        url = `/api/model_group/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`;
      }
      
      const res = await API.get(url);
      const { success, message, data } = res.data;
      
      if (success) {
        setModelGroups(data.data || []);
        setModelGroupsTotal(data.total || 0);
      } else {
        showError(message || t('加载模型分组失败'));
      }
    } catch (error) {
      showError(t('加载模型分组失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      const res = await API.get('/api/user_group?page=1&size=1000');
      const { success, message, data } = res.data;
      
      if (success) {
        setUserGroups(data.data || []);
      } else {
        showError(message || t('加载用户组失败'));
      }
    } catch (error) {
      showError(t('加载用户组失败'));
    }
  };

  useEffect(() => {
    if (activeTab === 'model_groups') {
      loadModelGroups();
    } else if (activeTab === 'permissions') {
      loadUserGroups();
      loadModelGroups(1, 1000, '');
    }
  }, [activeTab]);

  const handleModelGroupSearch = () => {
    setModelGroupsPage(1);
    loadModelGroups(1, modelGroupsPageSize, modelGroupsKeyword);
  };

  const handleModelGroupPageChange = (page) => {
    setModelGroupsPage(page);
    loadModelGroups(page, modelGroupsPageSize, modelGroupsKeyword);
  };

  const openModelGroupModal = (group = null) => {
    setEditingModelGroup(group);
    setShowModelGroupModal(true);
    
    if (modelGroupFormApi && group) {
      modelGroupFormApi.setValues({
        name: group.name,
        display_name: group.display_name,
        description: group.description,
        model_list: group.model_list ? JSON.stringify(group.model_list, null, 2) : '',
        status: group.status,
      });
    } else if (modelGroupFormApi) {
      modelGroupFormApi.reset();
      modelGroupFormApi.setValues({ status: 1 });
    }
  };

  const closeModelGroupModal = () => {
    setShowModelGroupModal(false);
    setEditingModelGroup(null);
    if (modelGroupFormApi) {
      modelGroupFormApi.reset();
    }
  };

  const handleModelGroupSubmit = async (values) => {
    try {
      let modelList = [];
      if (values.model_list && values.model_list.trim()) {
        try {
          modelList = JSON.parse(values.model_list);
          if (!Array.isArray(modelList)) {
            showError(t('模型列表必须是数组格式'));
            return;
          }
        } catch (e) {
          showError(t('模型列表JSON格式错误'));
          return;
        }
      }

      const payload = {
        name: values.name,
        display_name: values.display_name,
        description: values.description || '',
        model_list: modelList,
        status: values.status || 1,
      };

      let res;
      if (editingModelGroup) {
        payload.id = editingModelGroup.id;
        res = await API.put('/api/model_group', payload);
      } else {
        res = await API.post('/api/model_group', payload);
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(editingModelGroup ? t('更新成功') : t('创建成功'));
        closeModelGroupModal();
        loadModelGroups();
      } else {
        showError(message || t('操作失败'));
      }
    } catch (error) {
      showError(t('操作失败'));
    }
  };

  const handleDeleteModelGroup = async (id) => {
    try {
      const res = await API.delete(`/api/model_group/${id}`);
      const { success, message } = res.data;
      
      if (success) {
        showSuccess(t('删除成功'));
        loadModelGroups();
      } else {
        showError(message || t('删除失败'));
      }
    } catch (error) {
      showError(t('删除失败'));
    }
  };

  const openPermissionModal = async (userGroup) => {
    setCurrentUserGroup(userGroup);
    setShowPermissionModal(true);
    
    try {
      const res = await API.get(`/api/user_group/${userGroup.id}/permissions`);
      const { success, data } = res.data;
      
      if (success && data.permissions) {
        const groupIds = data.permissions.map(p => p.model_group_id);
        setSelectedModelGroups(groupIds);
      }
    } catch (error) {
      showError(t('加载权限失败'));
    }
  };

  const closePermissionModal = () => {
    setShowPermissionModal(false);
    setCurrentUserGroup(null);
    setSelectedModelGroups([]);
  };

  const handleSavePermissions = async () => {
    if (!currentUserGroup) return;
    
    try {
      const res = await API.put(`/api/user_group/${currentUserGroup.id}/permissions`, {
        model_group_ids: selectedModelGroups,
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

  const handleCheckboxChange = (groupId, checked) => {
    if (checked) {
      setSelectedModelGroups([...selectedModelGroups, groupId]);
    } else {
      setSelectedModelGroups(selectedModelGroups.filter(id => id !== groupId));
    }
  };

  const modelGroupColumns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: t('分组名称'), dataIndex: 'name', width: 150, render: (text) => <Text strong>{text}</Text> },
    { title: t('显示名称'), dataIndex: 'display_name', width: 150 },
    { title: t('描述'), dataIndex: 'description', ellipsis: true, render: (text) => <Text type="secondary">{text || '-'}</Text> },
    { title: t('模型数量'), dataIndex: 'model_list', width: 100, render: (list) => <Tag>{Array.isArray(list) ? list.length : 0}</Tag> },
    { title: t('状态'), dataIndex: 'status', width: 100, render: (status) => <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? t('启用') : t('禁用')}</Tag> },
    {
      title: t('操作'),
      dataIndex: 'operate',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button theme="borderless" type="primary" size="small" icon={<IconEdit />} onClick={() => openModelGroupModal(record)}>{t('编辑')}</Button>
          <Popconfirm title={t('确定删除此模型分组吗？')} content={t('此操作不可恢复')} onConfirm={() => handleDeleteModelGroup(record.id)} okText={t('确定')} cancelText={t('取消')}>
            <Button theme="borderless" type="danger" size="small" icon={<IconDelete />}>{t('删除')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userGroupColumns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: t('用户组名称'), dataIndex: 'name', width: 150, render: (text) => <Text strong>{text}</Text> },
    { title: t('显示名称'), dataIndex: 'display_name', width: 150 },
    { title: t('描述'), dataIndex: 'description', ellipsis: true, render: (text) => <Text type="secondary">{text || '-'}</Text> },
    {
      title: t('操作'),
      dataIndex: 'operate',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Button theme="solid" type="primary" size="small" icon={<IconLink />} onClick={() => openPermissionModal(record)}>{t('配置权限')}</Button>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        <TabPane tab={t('模型分组管理')} itemKey="model_groups">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Input prefix={<IconSearch />} placeholder={t('搜索模型分组名称')} value={modelGroupsKeyword} onChange={(value) => setModelGroupsKeyword(value)} onEnterPress={handleModelGroupSearch} style={{ width: 300 }} />
                <Button onClick={handleModelGroupSearch}>{t('搜索')}</Button>
                <Button theme="solid" type="primary" icon={<IconPlus />} onClick={() => openModelGroupModal()}>{t('创建模型分组')}</Button>
              </Space>
            </div>
            <Spin spinning={loading}>
              <Table columns={modelGroupColumns} dataSource={modelGroups} pagination={{ currentPage: modelGroupsPage, pageSize: modelGroupsPageSize, total: modelGroupsTotal, showSizeChanger: true, pageSizeOpts: [10, 20, 50, 100], onPageChange: handleModelGroupPageChange, onPageSizeChange: (size) => { setModelGroupsPageSize(size); setModelGroupsPage(1); loadModelGroups(1, size, modelGroupsKeyword); } }} rowKey="id" />
            </Spin>
          </Card>
        </TabPane>

        <TabPane tab={t('权限配置')} itemKey="permissions">
          <Card>
            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>{t('用户组与模型分组权限映射')}</Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>{t('为每个用户组配置可访问的模型分组')}</Text>
            <Table columns={userGroupColumns} dataSource={userGroups} rowKey="id" pagination={false} />
          </Card>
        </TabPane>
      </Tabs>

      <Modal title={editingModelGroup ? t('编辑模型分组') : t('创建模型分组')} visible={showModelGroupModal} onCancel={closeModelGroupModal} footer={null} width={700}>
        <Form getFormApi={(api) => setModelGroupFormApi(api)} onSubmit={handleModelGroupSubmit} labelPosition="left" labelWidth={120}>
          <Form.Input field="name" label={t('分组名称')} placeholder={t('例如：premium_models')} rules={[{ required: true, message: t('请输入分组名称') }, { pattern: /^[a-zA-Z0-9_]+$/, message: t('只能包含字母、数字和下划线') }]} disabled={!!editingModelGroup} extraText={t('分组的唯一标识，创建后不可修改')} />
          <Form.Input field="display_name" label={t('显示名称')} placeholder={t('例如：高级模型组')} rules={[{ required: true, message: t('请输入显示名称') }]} />
          <Form.TextArea field="description" label={t('描述')} placeholder={t('模型分组的详细描述')} rows={3} />
          <Form.TextArea field="model_list" label={t('模型列表JSON')} placeholder={t('模型名称数组（JSON格式）')} rows={10} extraText={t('格式示例：["gpt-4", "gpt-4-turbo", "claude-3-opus"]')} />
          <Form.RadioGroup field="status" label={t('状态')} initValue={1} rules={[{ required: true }]}>
            <Form.Radio value={1}>{t('启用')}</Form.Radio>
            <Form.Radio value={0}>{t('禁用')}</Form.Radio>
          </Form.RadioGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button onClick={closeModelGroupModal}>{t('取消')}</Button>
            <Button theme="solid" type="primary" htmlType="submit">{editingModelGroup ? t('更新') : t('创建')}</Button>
          </div>
        </Form>
      </Modal>

      <Modal title={t('配置权限') + ' - ' + (currentUserGroup?.display_name || '')} visible={showPermissionModal} onCancel={closePermissionModal} width={800} footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button onClick={closePermissionModal}>{t('取消')}</Button><Button theme="solid" type="primary" onClick={handleSavePermissions}>{t('保存')}</Button></div>}>
        <Text strong style={{ display: 'block', marginBottom: '16px' }}>{t('请选择该用户组可以访问的模型分组：')}</Text>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Row gutter={[16, 16]}>
            {modelGroups.map(group => (
              <Col span={12} key={group.id}>
                <Card style={{ padding: '12px' }}>
                  <Checkbox checked={selectedModelGroups.includes(group.id)} onChange={(e) => handleCheckboxChange(group.id, e.target.checked)}>
                    <div>
                      <Text strong>{group.display_name}</Text>
                      <Text type="secondary" size="small" style={{ display: 'block' }}>{group.description || '-'}</Text>
                      <Tag size="small" style={{ marginTop: '4px' }}>{t('包含')} {Array.isArray(group.model_list) ? group.model_list.length : 0} {t('个模型')}</Tag>
                    </div>
                  </Checkbox>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Modal>
    </div>
  );
};

export default ModelPermissionSetting;