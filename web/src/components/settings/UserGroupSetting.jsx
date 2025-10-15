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
  Toast,
  Popconfirm,
  Space,
  Tag,
  Typography,
  Spin,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconDelete, IconPlus, IconSearch } from '@douyinfe/semi-icons';

const { Text } = Typography;

const UserGroupSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formApi, setFormApi] = useState(null);

  // 加载用户组列表
  const loadUserGroups = async (page = currentPage, size = pageSize, keyword = searchKeyword) => {
    setLoading(true);
    try {
      let url = `/api/user_group?page=${page}&size=${size}`;
      if (keyword && keyword.trim()) {
        url = `/api/user_group/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`;
      }
      
      const res = await API.get(url);
      const { success, message, data } = res.data;
      
      if (success) {
        setUserGroups(data.data || []);
        setTotal(data.total || 0);
      } else {
        showError(message || t('加载用户组失败'));
      }
    } catch (error) {
      showError(t('加载用户组失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserGroups();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    loadUserGroups(1, pageSize, searchKeyword);
  };

  // 处理分页变化
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadUserGroups(page, pageSize, searchKeyword);
  };

  // 打开创建/编辑Modal
  const openModal = (group = null) => {
    setEditingGroup(group);
    setShowModal(true);
    
    if (formApi && group) {
      // 编辑模式，填充表单
      formApi.setValues({
        name: group.name,
        display_name: group.display_name,
        description: group.description,
        config: group.config ? JSON.stringify(group.config, null, 2) : '',
        status: group.status,
      });
    } else if (formApi) {
      // 创建模式，重置表单
      formApi.reset();
      formApi.setValues({ status: 1 });
    }
  };

  // 关闭Modal
  const closeModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    if (formApi) {
      formApi.reset();
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      // 验证并解析JSON配置
      let config = {};
      if (values.config && values.config.trim()) {
        try {
          config = JSON.parse(values.config);
        } catch (e) {
          showError(t('配置JSON格式错误'));
          return;
        }
      }

      const payload = {
        name: values.name,
        display_name: values.display_name,
        description: values.description || '',
        config: config,
        status: values.status || 1,
      };

      let res;
      if (editingGroup) {
        // 编辑
        payload.id = editingGroup.id;
        res = await API.put('/api/user_group', payload);
      } else {
        // 创建
        res = await API.post('/api/user_group', payload);
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(editingGroup ? t('更新成功') : t('创建成功'));
        closeModal();
        loadUserGroups();
      } else {
        showError(message || t('操作失败'));
      }
    } catch (error) {
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
        loadUserGroups();
      } else {
        showError(message || t('删除失败'));
      }
    } catch (error) {
      showError(t('删除失败'));
    }
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('用户组名称'),
      dataIndex: 'name',
      width: 150,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('显示名称'),
      dataIndex: 'display_name',
      width: 150,
    },
    {
      title: t('描述'),
      dataIndex: 'description',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? t('启用') : t('禁用')}
        </Tag>
      ),
    },
    {
      title: t('操作'),
      dataIndex: 'operate',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            theme="borderless"
            type="primary"
            size="small"
            icon={<IconEdit />}
            onClick={() => openModal(record)}
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
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input
              prefix={<IconSearch />}
              placeholder={t('搜索用户组名称')}
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
              onClick={() => openModal()}
            >
              {t('创建用户组')}
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={userGroups}
            pagination={{
              currentPage: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50, 100],
              onPageChange: handlePageChange,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
                loadUserGroups(1, size, searchKeyword);
              },
            }}
            rowKey="id"
          />
        </Spin>
      </Card>

      {/* 创建/编辑Modal */}
      <Modal
        title={editingGroup ? t('编辑用户组') : t('创建用户组')}
        visible={showModal}
        onCancel={closeModal}
        footer={null}
        width={700}
      >
        <Form
          getFormApi={(api) => setFormApi(api)}
          onSubmit={handleSubmit}
          labelPosition="left"
          labelWidth={120}
        >
          <Form.Input
            field="name"
            label={t('用户组名称')}
            placeholder={t('例如：github_users')}
            rules={[
              { required: true, message: t('请输入用户组名称') },
              { 
                pattern: /^[a-zA-Z0-9_]+$/, 
                message: t('只能包含字母、数字和下划线') 
              },
            ]}
            disabled={!!editingGroup}
            extraText={t('用户组的唯一标识，创建后不可修改')}
          />
          
          <Form.Input
            field="display_name"
            label={t('显示名称')}
            placeholder={t('例如：GitHub 用户组')}
            rules={[{ required: true, message: t('请输入显示名称') }]}
          />
          
          <Form.TextArea
            field="description"
            label={t('描述')}
            placeholder={t('用户组的详细描述')}
            rows={3}
          />
          
          <Form.TextArea
            field="config"
            label={t('JSON配置')}
            placeholder={t('自动分配规则配置（JSON格式）')}
            rows={10}
            extraText={
              <div>
                <Text type="secondary">{t('配置示例：')}</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginTop: '4px',
                }}>
{`{
  "auto_assign": {
    "enabled": true,
    "register_source": "github"
  }
}`}
                </pre>
              </div>
            }
          />
          
          <Form.RadioGroup
            field="status"
            label={t('状态')}
            initValue={1}
            rules={[{ required: true }]}
          >
            <Form.Radio value={1}>{t('启用')}</Form.Radio>
            <Form.Radio value={0}>{t('禁用')}</Form.Radio>
          </Form.RadioGroup>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button onClick={closeModal}>{t('取消')}</Button>
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