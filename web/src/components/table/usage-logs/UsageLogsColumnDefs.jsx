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

import React from 'react';
import {
  Avatar,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  timestamp2string,
  renderGroup,
  renderQuota,
  stringToColor,
  getLogOther,
  renderModelTag,
  renderClaudeLogContent,
  renderLogContent,
  renderModelPriceSimple,
  renderAudioModelPrice,
  renderClaudeModelPrice,
  renderModelPrice,
} from '../../../helpers';

const colors = [
  'amber',
  'blue',
  'cyan',
  'green',
  'grey',
  'indigo',
  'light-blue',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'violet',
  'yellow',
];

// Render functions
function renderType(type, t) {
  switch (type) {
    case 1:
      return (
        <Tag color='cyan' shape='circle'>
          {t('充值')}
        </Tag>
      );
    case 2:
      return (
        <Tag color='lime' shape='circle'>
          {t('消费')}
        </Tag>
      );
    case 3:
      return (
        <Tag color='orange' shape='circle'>
          {t('管理')}
        </Tag>
      );
    case 4:
      return (
        <Tag color='purple' shape='circle'>
          {t('系统')}
        </Tag>
      );
    case 5:
      return (
        <Tag color='red' shape='circle'>
          {t('错误')}
        </Tag>
      );
    default:
      return (
        <Tag color='grey' shape='circle'>
          {t('未知')}
        </Tag>
      );
  }
}

function renderIsStream(bool, t) {
  if (bool) {
    return (
      <Tag color='blue' shape='circle'>
        {t('流')}
      </Tag>
    );
  } else {
    return (
      <Tag color='purple' shape='circle'>
        {t('非流')}
      </Tag>
    );
  }
}

function renderUseTime(type, t) {
  const time = parseInt(type);
  if (time < 101) {
    return (
      <Tag color='green' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  } else if (time < 300) {
    return (
      <Tag color='orange' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  } else {
    return (
      <Tag color='red' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  }
}

function renderFirstUseTime(type, t) {
  let time = parseFloat(type) / 1000.0;
  time = time.toFixed(1);
  if (time < 3) {
    return (
      <Tag color='green' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  } else if (time < 10) {
    return (
      <Tag color='orange' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  } else {
    return (
      <Tag color='red' shape='circle'>
        {' '}
        {time} s{' '}
      </Tag>
    );
  }
}

function renderModelName(record, copyText, t) {
  return renderModelTag(record.model_name, {
    onClick: (event) => {
      copyText(event, record.model_name).then((r) => {});
    },
  });
}

export const getLogsColumns = ({
  t,
  COLUMN_KEYS,
  copyText,
  showUserInfoFunc,
  isAdminUser,
}) => {
  return [
    {
      key: COLUMN_KEYS.TIME,
      title: t('时间'),
      dataIndex: 'timestamp2string',
    },
    {
      key: COLUMN_KEYS.USERNAME,
      title: t('用户'),
      dataIndex: 'username',
      render: (text, record, index) => {
        return isAdminUser ? (
          <div>
            <Avatar
              size='extra-small'
              color={stringToColor(text)}
              style={{ marginRight: 4 }}
              onClick={(event) => {
                event.stopPropagation();
                showUserInfoFunc(record.user_id);
              }}
            >
              {typeof text === 'string' && text.slice(0, 1)}
            </Avatar>
            {text}
          </div>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.TOKEN,
      title: t('令牌'),
      dataIndex: 'token_name',
      render: (text, record, index) => {
        return record.type === 0 || record.type === 2 || record.type === 5 ? (
          <div>
            <Tag
              color='grey'
              shape='circle'
              onClick={(event) => {
                copyText(event, text);
              }}
            >
              {' '}
              {t(text)}{' '}
            </Tag>
          </div>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.GROUP,
      title: t('分组'),
      dataIndex: 'group',
      render: (text, record, index) => {
        if (record.type === 0 || record.type === 2 || record.type === 5) {
          if (record.group) {
            return <>{renderGroup(record.group)}</>;
          } else {
            let other = null;
            try {
              other = JSON.parse(record.other);
            } catch (e) {
              console.error(
                `Failed to parse record.other: "${record.other}".`,
                e,
              );
            }
            if (other === null) {
              return <></>;
            }
            if (other.group !== undefined) {
              return <>{renderGroup(other.group)}</>;
            } else {
              return <></>;
            }
          }
        } else {
          return <></>;
        }
      },
    },
    {
      key: COLUMN_KEYS.TYPE,
      title: t('类型'),
      dataIndex: 'type',
      render: (text, record, index) => {
        return <>{renderType(text, t)}</>;
      },
    },
    {
      key: COLUMN_KEYS.MODEL,
      title: t('模型'),
      dataIndex: 'model_name',
      render: (text, record, index) => {
        return record.type === 0 || record.type === 2 || record.type === 5 ? (
          <>{renderModelName(record, copyText, t)}</>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.USE_TIME,
      title: t('用时/首字'),
      dataIndex: 'use_time',
      render: (text, record, index) => {
        if (!(record.type === 2 || record.type === 5)) {
          return <></>;
        }
        if (record.is_stream) {
          let other = getLogOther(record.other);
          return (
            <>
              <Space>
                {renderUseTime(text, t)}
                {renderFirstUseTime(other?.frt, t)}
                {renderIsStream(record.is_stream, t)}
              </Space>
            </>
          );
        } else {
          return (
            <>
              <Space>
                {renderUseTime(text, t)}
                {renderIsStream(record.is_stream, t)}
              </Space>
            </>
          );
        }
      },
    },
    {
      key: COLUMN_KEYS.PROMPT,
      title: t('输入'),
      dataIndex: 'prompt_tokens',
      render: (text, record, index) => {
        return record.type === 0 || record.type === 2 || record.type === 5 ? (
          <>{<span> {text} </span>}</>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.COMPLETION,
      title: t('输出'),
      dataIndex: 'completion_tokens',
      render: (text, record, index) => {
        return parseInt(text) > 0 &&
          (record.type === 0 || record.type === 2 || record.type === 5) ? (
          <>{<span> {text} </span>}</>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.COST,
      title: t('花费'),
      dataIndex: 'quota',
      render: (text, record, index) => {
        return record.type === 0 || record.type === 2 || record.type === 5 ? (
          <>{renderQuota(text, 6)}</>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.IP,
      title: t('IP'),
      dataIndex: 'ip',
      render: (text, record, index) => {
        return (record.type === 2 || record.type === 5) && text ? (
          <Tooltip content={text}>
            <span>
              <Tag
                color='orange'
                shape='circle'
                onClick={(event) => {
                  copyText(event, text);
                }}
              >
                {text}
              </Tag>
            </span>
          </Tooltip>
        ) : (
          <></>
        );
      },
    },
    {
      key: COLUMN_KEYS.DETAILS,
      title: t('详情'),
      dataIndex: 'content',
      fixed: 'right',
      render: (text, record, index) => {
        let other = getLogOther(record.other);
        if (other == null || record.type !== 2) {
          return (
            <Typography.Paragraph
              ellipsis={{
                rows: 2,
                showTooltip: {
                  type: 'popover',
                  opts: { style: { width: 240 } },
                },
              }}
              style={{ maxWidth: 240 }}
            >
              {text}
            </Typography.Paragraph>
          );
        }
        let content = other?.claude
          ? renderModelPriceSimple(
              other.model_ratio,
              other.model_price,
              other.group_ratio,
              other?.user_group_ratio,
              other.cache_tokens || 0,
              other.cache_ratio || 1.0,
              other.cache_creation_tokens || 0,
              other.cache_creation_ratio || 1.0,
              false,
              1.0,
              other?.is_system_prompt_overwritten,
              'claude',
            )
          : renderModelPriceSimple(
              other.model_ratio,
              other.model_price,
              other.group_ratio,
              other?.user_group_ratio,
              other.cache_tokens || 0,
              other.cache_ratio || 1.0,
              0,
              1.0,
              false,
              1.0,
              other?.is_system_prompt_overwritten,
              'openai',
            );
        return (
          <Typography.Paragraph
            ellipsis={{
              rows: 3,
            }}
            style={{ maxWidth: 240, whiteSpace: 'pre-line' }}
          >
            {content}
          </Typography.Paragraph>
        );
      },
    },
  ];
};
