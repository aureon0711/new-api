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

import { Button, Card, Empty, Input, Modal, Pagination, Typography } from '@douyinfe/semi-ui';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import { API, renderQuota, showError, showSuccess } from '../../helpers';

const { Title, Text } = Typography;

const CheckinPage = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);

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
      // 使用后端提供的 /api/checkin/status 接口，并适配前端字段
      const res = await API.get('/api/checkin/status');
      const { success, message, data } = res.data;
      if (success) {
        const mapped = {
          // 是否开启由后端配置决定
          enabled: data?.config?.enabled ?? false,
          // 今日是否已签到
          checked_today: data?.has_checked_in ?? false,
          // 连续天数与本月次数、累计额度
          consecutive_days: data?.stat?.consecutive_days ?? 0,
          month_count: data?.stat?.this_month_checkins ?? 0,
          total_quota: data?.stat?.total_quota ?? 0,
          // 是否启用签到码
          code_enabled: data?.config?.checkin_code_enabled ?? false,
          // 今日签到详情（若有）
          today_checkin: data?.today_checkin || null,
        };
        setCheckinData(mapped);
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
      // 调整为后端实际路由与分页参数名
      const res = await API.get(`/api/checkin/history?page=${page}&page_size=${size}`);
      const { success, message, data } = res.data;
      if (success) {
        setCheckinHistory(data.items || []);
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
      // 后端需要 JSON 体进行绑定，即使不使用签到码也需传空对象
      const res = await API.post('/api/checkin/', {});
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
      // 使用与普通签到相同的接口，传递 checkin_code 字段
      const res = await API.post('/api/checkin/', {
        checkin_code: checkinCode.trim(),
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

  // 根据接口返回的配置判断是否开启
  const isCheckinDisabled = checkinData ? !checkinData.enabled : false;

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