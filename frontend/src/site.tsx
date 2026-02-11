import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, Table, Button, Tag, Modal, Drawer, Input, Tooltip, message } from 'antd';
import { RocketOutlined, FileSearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { BASE, isValidEnvironment } from './const';

function App({ site }: { site: string }) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [operating, setOperating] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const [inspecting, setInspecting] = useState('');
  const { status: inspectStatus, data: inspectData } = useQuery({
    queryKey: ['inspectinfo', site, inspecting],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/inspect`, {
        method: 'POST',
        body: JSON.stringify({ site, version: inspecting }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      return data.data;
    },
    enabled: !!inspecting,
  });

  const { status, data } = useQuery({
    queryKey: ['siteinfo', site],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/siteinfo`, {
        method: 'POST',
        body: JSON.stringify({ site }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (linkName: string) => {
      await fetch(`${BASE}/api/link`, {
        method: 'POST',
        body: JSON.stringify({
          site,
          targetVersion: operating,
          linkName,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      messageApi.success('Success');
      queryClient.invalidateQueries({ queryKey: ['siteinfo'] });
      closeModal();
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (linkName: string) => {
      await fetch(`${BASE}/api/unlink`, {
        method: 'POST',
        body: JSON.stringify({
          site,
          targetVersion: operating,
          linkName,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      messageApi.success('Success');
      queryClient.invalidateQueries({ queryKey: ['siteinfo'] });
      closeModal();
    },
  });

  const linksKv = Object.entries(data?.links || {});

  const versionsKv = Object.entries(data?.versions || {});

  const tableData = versionsKv.map((x) => {
    return {
      key: x[0],
      version: x[0],
      date: x[1],
      env: linksKv.filter((y) => y[1] === x[0]).map((y) => y[0]),
    };
  });

  const handlePublish = (linkName: string) => {
    publishMutation.mutate(linkName);
  };

  const handleUnpublish = (linkName: string) => {
    unpublishMutation.mutate(linkName);
  };

  const closeModal = () => {
    setOperating('');
    setInputValue('');
    setSelectValue('');
  };

  const closeInspectModal = () => {
    setInspecting('');
  };

  return (
    <>
      {contextHolder}

      <Modal
        title={'Manage Publication: ' + operating}
        width={820}
        open={!!operating}
        onCancel={closeModal}
        onOk={closeModal}
        footer={null}
      >
        <div style={{ display: 'flex' }}>
          {/* Publish to Current */}
          <div style={{ flex: 1, paddingRight: '24px' }}>
            <h3 style={{ marginBottom: 8 }}>Publish as Default</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Sets this version as the default production version.
            </p>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Visitors will see it without any special headers.
            </p>

            <Button
              type="primary"
              onClick={() => {
                handlePublish('current');
              }}
            >
              Set as Default Version
            </Button>
          </div>

          {/* Publish to Environment */}
          <div style={{ flex: 1, borderInline: '1px solid #f0f0f0', padding: '0 24px' }}>
            <h3 style={{ marginBottom: 8 }}>Publish to Environment</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>Publish to a preview environment.</p>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Viewers must set the header:
              <code style={{ display: 'block' }}>x-env-version: [environment]</code>
            </p>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Use browser extensions like ModHeader to test.
            </p>

            <Input
              placeholder="Enter environment name"
              style={{ width: '100%', marginBottom: 12 }}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              suffix={
                <Tooltip title="Environment names must be lowercase letters only">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              }
            />

            <Button
              color="green"
              variant="solid"
              onClick={() => {
                if (!isValidEnvironment(inputValue)) {
                  messageApi.error('Environment name must be lowercase letters only');
                  return;
                }
                handlePublish(inputValue);
              }}
            >
              Publish to Environment
            </Button>
          </div>

          {/* Unpublish */}
          <div style={{ flex: 1, paddingLeft: '24px' }}>
            <h3 style={{ marginBottom: 8 }}>Unpublish Version</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Remove this version from an environment.
            </p>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Select the environment where you want to unpublish:
            </p>

            <Select
              placeholder="Select environment"
              style={{ width: '100%', marginBottom: 12 }}
              options={tableData
                .find((x) => x.version === operating)
                ?.env?.map((x) => {
                  return { label: x, value: x };
                })}
              value={selectValue || undefined}
              onChange={(v) => {
                setSelectValue(v);
              }}
            />
            <Button
              type="primary"
              danger
              onClick={() => {
                if (!selectValue) {
                  messageApi.error('Please select an environment');
                  return;
                }
                handleUnpublish(selectValue);
              }}
            >
              Unpublish from Environment
            </Button>
          </div>
        </div>
      </Modal>

      <Drawer
        closable
        title={'Inspect: ' + inspecting}
        open={!!inspecting}
        onClose={closeInspectModal}
        loading={inspectStatus === 'pending'}
      >
        <div>
          {inspectStatus === 'error' && <div>Error loading data</div>}
          {inspectStatus === 'success' &&
            inspectData?.map((x: string) => {
              return <div key={x}>{x}</div>;
            })}
        </div>
      </Drawer>

      <Table
        loading={status === 'pending'}
        dataSource={tableData}
        columns={[
          { title: 'Version', dataIndex: 'version' },
          {
            title: 'Last Modified',
            dataIndex: 'date',
            render: (col) => {
              return dayjs(col).format('YYYY-MM-DD HH:mm:ss');
            },
          },
          {
            title: (
              <div>
                Environment
                <Tooltip title="'current' is the default version served without headers. Other environments require the x-env-version header">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              </div>
            ),
            dataIndex: 'env',
            render: (col) => (
              <div style={{ display: 'flex', gap: '4px' }}>
                {col.map((x: string) => (
                  <Tag key={x} color={x === 'current' ? 'blue' : 'green'}>
                    {x}
                  </Tag>
                ))}
              </div>
            ),
          },
          {
            title: 'Actions',
            dataIndex: '_op_',
            render: (_col, item) => {
              return (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    icon={<RocketOutlined />}
                    onClick={() => {
                      setOperating(item.version);
                    }}
                  >
                    Publish / Unpublish
                  </Button>

                  <Button
                    icon={<FileSearchOutlined />}
                    onClick={() => {
                      setInspecting(item.version);
                    }}
                  >
                    Inspect
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
    </>
  );
}

export default App;
