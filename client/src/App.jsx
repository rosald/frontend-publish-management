import { useState } from 'react';
import { useRequest } from 'ahooks';
import { Select, Table, Upload, Button, Tag, Modal, Input, message } from 'antd';
import dayjs from 'dayjs';

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [site, setSite] = useState('');

  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [operating, setOperating] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const { run, data, loading } = useRequest(async () => {
    const res = await fetch('/api/list');
    const data = await res.json();
    return data.data;
  });

  const sitesData = data || {};

  const selectedSiteData = sitesData[site] || {};

  const selectOptions = Object.keys(sitesData).map((x) => {
    return {
      label: x,
      value: x,
    };
  });

  const linksKv = Object.entries(selectedSiteData.links || {});

  const versionsKv = Object.entries(selectedSiteData.versions || {});

  const tableData = versionsKv.map((x) => {
    return {
      key: x[0],
      version: x[0],
      date: x[1],
      path: selectedSiteData.path + '/' + x[0],
      env: linksKv.filter((y) => y[1] === x[0]).map((y) => y[0]),
    };
  });

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('tarball', fileList[0]);
    formData.append('site', site);
    setUploading(true);
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setFileList([]);
      })
      .catch(() => {
        // do nothing
      })
      .finally(() => {
        setUploading(false);
        run();
      });
  };

  const handlePublish = (linkName) => {
    fetch('/api/link', {
      method: 'POST',
      body: JSON.stringify({
        site,
        targetVersion: operating,
        linkName,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(() => {
      messageApi.success('success');
      run();
      closeModal();
    });
  };

  const handleUnpublish = (linkName) => {
    fetch('/api/unlink', {
      method: 'POST',
      body: JSON.stringify({
        site,
        targetVersion: operating,
        linkName,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(() => {
      messageApi.success('success');
      run();
      closeModal();
    });
  };

  const closeModal = () => {
    setOperating('');
    setInputValue('');
  };

  return (
    <>
      {contextHolder}
      <div>
        choose site:
        <Select
          style={{ width: 280 }}
          options={selectOptions}
          value={site}
          onChange={(v) => {
            setSite(v);
          }}
        />
      </div>

      <div style={{ display: 'flex', marginBlock: 16 }}>
        <Upload
          onRemove={() => {
            setFileList([]);
          }}
          beforeUpload={(file) => {
            setFileList([file]);
            return false;
          }}
          fileList={fileList}
        >
          <Button disabled={!site}>Select File</Button>
        </Upload>

        <Button onClick={handleUpload} disabled={fileList.length === 0} loading={uploading}>
          {uploading ? 'Uploading' : 'Start Upload'}
        </Button>
      </div>

      <Modal open={!!operating} onCancel={closeModal} onOk={closeModal}>
        <div>
          <h3>publish</h3>

          <h5>publish env</h5>

          <Input
            placeholder="enter an env to publish"
            style={{ width: 220 }}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
          />
          <Button
            onClick={() => {
              if (!/^[a-z]+$/.test(inputValue)) {
                messageApi.error('must a-z');
                return;
              }
              handlePublish(inputValue);
            }}
          >
            publish
          </Button>

          <h5>publish current</h5>
          <Button
            type="primary"
            onClick={() => {
              handlePublish('current');
            }}
          >
            publish current
          </Button>
        </div>
        <div>
          <h3>unpublish</h3>
          <Select
            placeholder="select an env to unpublish"
            style={{ width: 220 }}
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
            onClick={() => {
              if (!/^[a-z]+$/.test(selectValue)) {
                messageApi.error('must a-z');
                return;
              }
              handleUnpublish(selectValue);
            }}
          >
            unpublish
          </Button>
        </div>
      </Modal>

      <Table
        loading={loading}
        dataSource={tableData}
        columns={[
          { title: 'version', dataIndex: 'version' },
          { title: 'path', dataIndex: 'path' },
          {
            title: 'date',
            dataIndex: 'date',
            render: (col) => {
              return dayjs(col).format('YYYY-MM-DD HH:mm:ss');
            },
          },
          {
            title: 'env',
            dataIndex: 'env',
            render: (col) => (
              <>
                {col.map((x) => (
                  <Tag key={x} color={x === 'current' ? 'red' : 'green'}>
                    {x}
                  </Tag>
                ))}
              </>
            ),
          },
          {
            title: 'operation',
            dataIndex: '_op_',
            render: (_col, item) => {
              return (
                <Button
                  onClick={() => {
                    setOperating(item.version);
                  }}
                >
                  publish/unpublish
                </Button>
              );
            },
          },
        ]}
      />
    </>
  );
}

export default App;
