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

import { IconCalendar, IconCheckCircleStroked, IconClock, IconGift } from '@douyinfe/semi-icons';
import { Button, Card, Empty, Input, Modal, Pagination, Spin, Typography } from '@douyinfe/semi-ui';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import { API, renderQuota, showError, showSuccess } from '../../helpers';
import CheckinCalendar from './CheckinCalendar';
import './checkin.css';

const { Title, Text } = Typography;

const CheckinPage = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);

  // 签到相关状态
  const [checkinData, setCheckinData] = useState(null);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
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
      const res = await API.get('/api/checkin/status');
      const { success, message, data } = res.data;
      if (success) {
        const mapped = {
          enabled: data?.config?.enabled ?? false,
          checked_today: data?.has_checked_in ?? false,
          consecutive_days: data?.stat?.consecutive_days ?? 0,
          month_count: data?.stat?.this_month_checkins ?? 0,
          total_quota: data?.stat?.total_quota ?? 0,
          code_enabled: data?.config?.checkin_code_enabled ?? false,
          calendar_enabled: data?.config?.calendar_enabled ?? true,
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
      const res = await API.post('/api/checkin/', {});
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('签到成功！获得 $') + renderQuota(data.quota));
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        
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
      const res = await API.post('/api/checkin/', {
        checkin_code: checkinCode.trim(),
      });
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('签到成功！获得 $') + renderQuota(data.quota));
        setShowCodeModal(false);
        setCheckinCode('');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        
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

  if (!checkinData) {
    return (
      <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2 flex items-center justify-center'>
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2 pb-8'>
      {/* 成功动画 */}
      {showSuccessAnimation && (
        <div className='checkin-success-animation'>
          <div className='success-icon'>🎉</div>
          <div className='success-text'>{t('签到成功')}</div>
        </div>
      )}

      <div className='space-y-6'>
        {/* 顶部横幅卡片 */}
        <Card className='checkin-banner-card'>
          <div className='flex flex-col lg:flex-row justify-between items-center gap-6'>
            {/* 左侧：欢迎信息 */}
            <div className='flex-1 text-center lg:text-left'>
              <Title heading={2} className='mb-2' style={{ color: 'white' }}>
                {t('每日签到')}
              </Title>
              <Text type='secondary' style={{ color: 'rgba(255,255,255,0.9)' }}>
                {checkinData.checked_today ? t('今日已完成签到，明天继续加油！') : t('每日签到，积少成多！')}
              </Text>
              <div className='mt-3'>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  {t('连续签到')} <strong style={{ fontSize: '18px', color: '#FFD700' }}>{checkinData.consecutive_days}</strong> {t('天')}
                </Text>
              </div>
            </div>

            {/* 右侧：签到按钮 */}
            <div className='flex flex-col items-center gap-3'>
              <Button
                type='primary'
                size='large'
                theme='solid'
                loading={checkinLoading}
                disabled={checkinData.checked_today}
                onClick={() => {
                  if (checkinData.code_enabled) {
                    setShowCodeModal(true);
                  } else {
                    doCheckin();
                  }
                }}
                className='checkin-button'
                icon={checkinData.checked_today ? <IconCheckCircleStroked /> : <IconCalendar />}
              >
                {checkinData.checked_today ? t('今日已签到') : t('立即签到')}
              </Button>
              {checkinData.checked_today && checkinData.today_checkin && (
                <div className='today-reward'>
                  <IconGift style={{ color: '#52c41a' }} />
                  <Text type='success' strong>
                    {t('今日获得')} ${renderQuota(checkinData.today_checkin.quota)}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 签到日历 */}
        {checkinData.calendar_enabled && (
          <CheckinCalendar checkinHistory={checkinHistory} />
        )}

        {/* 统计卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='stat-card stat-card-blue'>
            <div className='stat-card-content'>
              <div className='stat-icon'>
                <IconCalendar size='extra-large' />
              </div>
              <div className='stat-info'>
                <Text type='secondary' className='stat-label'>{t('本月签到')}</Text>
                <div className='stat-value'>{checkinData.month_count}</div>
                <Text type='tertiary' size='small'>{t('次')}</Text>
              </div>
            </div>
            <div className='stat-progress'>
              <div className='stat-progress-bar' style={{ width: `${(checkinData.month_count / 30) * 100}%` }}></div>
            </div>
          </Card>

          <Card className='stat-card stat-card-green'>
            <div className='stat-card-content'>
              <div className='stat-icon'>
                <IconGift size='extra-large' />
              </div>
              <div className='stat-info'>
                <Text type='secondary' className='stat-label'>{t('连续签到')}</Text>
                <div className='stat-value'>{checkinData.consecutive_days}</div>
                <Text type='tertiary' size='small'>{t('天')}</Text>
              </div>
            </div>
            <div className='stat-progress'>
              <div className='stat-progress-bar' style={{ width: `${Math.min((checkinData.consecutive_days / 30) * 100, 100)}%` }}></div>
            </div>
          </Card>

          <Card className='stat-card stat-card-purple'>
            <div className='stat-card-content'>
              <div className='stat-icon'>
                <IconGift size='extra-large' />
              </div>
              <div className='stat-info'>
                <Text type='secondary' className='stat-label'>{t('累计奖励')}</Text>
                <div className='stat-value'>${renderQuota(checkinData.total_quota)}</div>
                <Text type='tertiary' size='small'>{t('美元')}</Text>
              </div>
            </div>
            <div className='stat-progress'>
              <div className='stat-progress-bar' style={{ width: '100%' }}></div>
            </div>
          </Card>
        </div>

        {/* 签到历史 */}
        <Card className='history-card'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <IconClock size='large' />
              <Title heading={4} className='mb-0'>{t('签到历史')}</Title>
            </div>
          </div>
          
          {historyLoading ? (
            <div className='text-center py-8'>
              <Spin size='large' />
            </div>
          ) : checkinHistory.length === 0 ? (
            <Empty
              image='https://lf9-static.semi.design/obj/semi-tos-ops/image/empty.png'
              title={t('暂无签到记录')}
              description={t('开始签到获取奖励吧')}
            />
          ) : (
            <>
              <div className='history-list'>
                {checkinHistory.map((record, index) => (
                  <div key={record.id || index} className='history-item'>
                    <div className='history-item-left'>
                      <div className='history-date-badge'>
                        <span className='history-day'>
                          {new Date(record.created_at).getDate()}
                        </span>
                        <span className='history-month'>
                          {new Date(record.created_at).toLocaleDateString('zh-CN', { month: 'short' })}
                        </span>
                      </div>
                      <div className='history-info'>
                        <div className='history-time'>
                          {new Date(record.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className='history-method'>
                          {record.checkin_code ? (
                            <span className='method-badge code-badge'>
                              <IconGift size='small' /> {t('签到码')}
                            </span>
                          ) : (
                            <span className='method-badge normal-badge'>
                              <IconCalendar size='small' /> {t('普通签到')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='history-item-right'>
                      <div className='history-reward'>
                        <span className='reward-amount'>${renderQuota(record.quota)}</span>
                      </div>
                      <div className='history-streak'>
                        <IconGift size='small' style={{ color: '#faad14' }} />
                        <span>{record.consecutive_days || 1} {t('天')}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
            size='large'
          />
        </div>
      </Modal>
    </div>
  );
};

export default CheckinPage;
                        