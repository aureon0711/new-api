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

import { Card, Typography } from '@douyinfe/semi-ui';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './calendar.css';

const { Title, Text } = Typography;

const CheckinCalendar = ({ checkinHistory = [] }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkinDates, setCheckinDates] = useState(new Set());

  useEffect(() => {
    // 从历史记录中提取签到日期
    const dates = new Set(
      checkinHistory.map(record => {
        const date = new Date(record.created_at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      })
    );
    setCheckinDates(dates);
  }, [checkinHistory]);

  // 获取当月的天数
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // 获取当月第一天是星期几（0-6，0是周日）
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // 生成日历数据
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    
    const days = [];
    
    // 添加空白占位
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // 添加当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCheckedIn = checkinDates.has(dateStr);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      days.push({
        day,
        dateStr,
        isCheckedIn,
        isToday,
      });
    }
    
    return days;
  };

  // 切换月份
  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const calendarDays = generateCalendar();
  const weekDays = [t('日'), t('一'), t('二'), t('三'), t('四'), t('五'), t('六')];

  return (
    <Card className='calendar-card'>
      <div className='calendar-header'>
        <button 
          className='calendar-nav-btn'
          onClick={() => changeMonth(-1)}
          aria-label='上个月'
        >
          ‹
        </button>
        <Title heading={4} className='calendar-title'>
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </Title>
        <button 
          className='calendar-nav-btn'
          onClick={() => changeMonth(1)}
          aria-label='下个月'
        >
          ›
        </button>
      </div>

      <div className='calendar-weekdays'>
        {weekDays.map((day, index) => (
          <div key={index} className='calendar-weekday'>
            {day}
          </div>
        ))}
      </div>

      <div className='calendar-days'>
        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className='calendar-day empty'></div>;
          }

          return (
            <div
              key={dayData.dateStr}
              className={`calendar-day ${dayData.isCheckedIn ? 'checked-in' : ''} ${dayData.isToday ? 'today' : ''}`}
              title={dayData.isCheckedIn ? t('已签到') : ''}
            >
              <span className='day-number'>{dayData.day}</span>
              {dayData.isCheckedIn && <span className='check-mark'>✓</span>}
              {dayData.isToday && <span className='today-dot'></span>}
            </div>
          );
        })}
      </div>

      <div className='calendar-legend'>
        <div className='legend-item'>
          <div className='legend-box today'></div>
          <Text size='small'>{t('今天')}</Text>
        </div>
        <div className='legend-item'>
          <div className='legend-box checked'></div>
          <Text size='small'>{t('已签到')}</Text>
        </div>
        <div className='legend-item'>
          <div className='legend-box unchecked'></div>
          <Text size='small'>{t('未签到')}</Text>
        </div>
      </div>
    </Card>
  );
};

export default CheckinCalendar;