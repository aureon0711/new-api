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

import { IconDelete, IconEdit, IconPlus, IconSearch } from '@douyinfe/semi-icons';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const UserGroupBasicSetting = () => {
  const { t } = useTranslation();
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 10, total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [formApi, setFormApi] = useState(null);

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

  useEffect(() => {
    loadUserGroups();
  }, []);

  // 打开编辑/创建弹窗
  const handleEdit = (record) => {
    setEditingGroup(record);
    setModalVisible(true);
    
    if (record && formApi) {
      formApi.setValues({
        name: record.name,
        display_name: record.display_name,
        status: record.status,
      });
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingGroup(null);
    if (formApi) {
      formApi.reset();
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      const payload = {
        name: values.name,
        display_name: values.display_name,
        config: '{}',
        status: values.status || 1,
      };

      let res;
      
      if (editingGroup) {
        payload.id = editingGroup.id;
        res = await API.put('/api/user_group', payload);
      } else {
        res = await API.post('/api/user_group', payload);
      }

      const { success, message } = res.data;
      if (success) {
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

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: t('名称'), dataIndex: 'name' },
    { title: t('显示名称'), dataIndex: 'display_name' },
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
        width={600}
      >
        <Form 
          getFormApi={(api) => setFormApi(api)} 
          onSubmit={handleSubmit} 
          labelPosition="left" 
          labelWidth={120}
          initValues={{ status: 1 }}
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

export default UserGroupBasicSetting;