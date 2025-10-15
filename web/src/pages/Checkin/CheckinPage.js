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

import React, { useEffect, useState, useContext } from 'react';
import { API, showError, showSuccess, renderQuota } from '../../helpers';
import { Card, Button, Input, Modal, Toast, Typography, Empty, Pagination } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';

const { Title, Text } = Typography;

const CheckinPage = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);

  // 签到相关状态
  const [checkinData, setCheckinData] = useState(null);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  
  // 签到码相关状态
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [checkinCode, setCheckinCode] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 获取签到汇总信息
  const getCheckinSummary = async () => {
    try {
      const res = await API.get('/api/user/checkin/summary');
      const { success, message, data } = res.data;
      if (success) {
        setCheckinData(data);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取签到信息失败'));
    }
  };

  // 获取签到历史
  const getCheckinHistory = async (page = 1, size = 10) => {
    setHistoryLoading(true);
    try {
      const res = await API.get(`/api/user/checkin/history?page=${page}&size=${size}`);
      const { success, message, data } = res.data;
      if (success) {
        setCheckinHistory(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取签到历史失败'));
    } finally {
      setHistoryLoading(false);
    }
  };

  // 执行签到
  const doCheckin = async () => {
    setCheckinLoading(true);
    try {
      const res = await API.post('/api/user/checkin');
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('签到成功！获得 $') + renderQuota(data.quota));
        // 刷新用户信息
        if (userState.user) {
          const updatedUser = {
            ...userState.user,
            quota: userState.user.quota + data.quota,
          };
          userDispatch({ type: 'login', payload: updatedUser });
        }
        // 刷新签到信息
        getCheckinSummary();
        getCheckinHistory(currentPage, pageSize);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('签到失败'));
    } finally {
      setCheckinLoading(false);
    }
  };

  // 使用签到码签到
  const useCheckinCode = async () => {
    if (!checkinCode.trim()) {
      showError(t('请输入签到码'));
      return;
    }
    setCodeSubmitting(true);
    try {
      const res = await API.post('/api/user/checkin/code', {
        code: checkinCode.trim()
      });
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('签到成功！获得 $') + renderQuota(data.quota));
        setShowCodeModal(false);
        setCheckinCode('');
        // 刷新用户信息
        if (userState.user) {
          const updatedUser = {
            ...userState.user,
            quota: userState.user.quota + data.quota,
          };
          userDispatch({ type: 'login', payload: updatedUser });
        }
        // 刷新签到信息
        getCheckinSummary();
        getCheckinHistory(currentPage, pageSize);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('签到码使用失败'));
    } finally {
      setCodeSubmitting(false);
    }
  };

  // 分页处理
  const handlePageChange = (page, pageSize) => {
    getCheckinHistory(page, pageSize);
  };

  useEffect(() => {
    getCheckinSummary();
    getCheckinHistory(1, pageSize);
  }, []);

  // 检查签到是否关闭
  const isCheckinDisabled = !statusState?.status?.checkin_enabled;

  if (isCheckinDisabled) {
    return (
      <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2'>
        <Card className='text-center py-12'>
          <Empty
            image='https://lf9-static.semi.design/obj/semi-tos-ops/image/empty.png'
            title={t('签到功能已关闭')}
            description={t('管理员已关闭签到功能，请稍后再试')}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2'>
      <div className='space-y-6'>
        {/* 签到汇总区域 */}
        <Card>
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
            <div className='flex-1'>
              <Title heading={3}>{t('签到汇总')}</Title>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                <div className='text-center p-4 bg-blue-50 rounded-lg'>
                  <Text type='secondary'>{t('本月签到次数')}</Text>
                  <div className='text-2xl font-bold text-blue-600 mt-2'>
                    {checkinData?.month_count || 0}
                  </div>
                </div>
                <div className='text-center p-4 bg-green-50 rounded-lg'>
                  <Text type='secondary'>{t('连续签到天数')}</Text>
                  <div className='text-2xl font-bold text-green-600 mt-2'>
                    {checkinData?.consecutive_days || 0}
                  </div>
                </div>
                <div className='text-center p-4 bg-purple-50 rounded-lg'>
                  <Text type='secondary'>{t('累计获得额度')}</Text>
                  <div className='text-2xl font-bold text-purple-600 mt-2'>
                    ${renderQuota(checkinData?.total_quota || 0)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 签到按钮区域 */}
            <div className='flex flex-col items-end gap-2'>
              <Button
                type='primary'
                size='large'
                loading={checkinLoading}
                disabled={checkinData?.checked_today}
                onClick={() => {
                  if (checkinData?.code_enabled) {
                    setShowCodeModal(true);
                  } else {
                    doCheckin();
                  }
                }}
                className='min-w-[120px]'
              >
                {checkinData?.checked_today ? t('今日已签到') : t('签到')}
              </Button>
            </div>
          </div>
        </Card>

        {/* 签到历史区域 */}
        <Card>
          <Title heading={4}>{t('签到历史')}</Title>
          <div className='mt-4'>
            {checkinHistory.length === 0 ? (
              <Empty
                image='https://lf9-static.semi.design/obj/semi-tos-ops/image/empty.png'
                title={t('暂无签到记录')}
                description={t('开始签到获取奖励吧')}
              />
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b'>
                        <th className='text-left py-3 px-4'>{t('签到时间')}</th>
                        <th className='text-left py-3 px-4'>{t('获得额度')}</th>
                        <th className='text-left py-3 px-4'>{t('签到方式')}</th>
                        <th className='text-left py-3 px-4'>{t('连续天数')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkinHistory.map((record, index) => (
                        <tr key={record.id || index} className='border-b hover:bg-gray-50'>
                          <td className='py-3 px-4'>
                            {new Date(record.created_at).toLocaleString()}
                          </td>
                          <td className='py-3 px-4 text-green-600 font-semibold'>
                            ${renderQuota(record.quota)}
                          </td>
                          <td className='py-3 px-4'>
                            {record.checkin_code ? t('签到码') : t('普通签到')}
                          </td>
                          <td className='py-3 px-4'>
                            {record.consecutive_days || 1} {t('天')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 分页 */}
                {total > pageSize && (
                  <div className='flex justify-center mt-6'>
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={total}
                      onChange={handlePageChange}
                      showSizeChanger
                      pageSizeOpts={[10, 20, 50]}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        getCheckinHistory(1, size);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 签到码输入模态框 */}
      <Modal
        title={t('使用签到码')}
        visible={showCodeModal}
        onCancel={() => {
          setShowCodeModal(false);
          setCheckinCode('');
        }}
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              setShowCodeModal(false);
              setCheckinCode('');
            }}
          >
            {t('取消')}
          </Button>,
          <Button
            key='confirm'
            type='primary'
            loading={codeSubmitting}
            onClick={useCheckinCode}
          >
            {t('确定')}
          </Button>,
        ]}
        centered
      >
        <div className='space-y-4'>
          <Text>{t('请输入签到码：')}</Text>
          <Input
            value={checkinCode}
            onChange={setCheckinCode}
            placeholder={t('请输入签到码')}
            onPressEnter={useCheckinCode}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CheckinPage;