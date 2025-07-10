import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

import { BASE, fileAccept, isValidFileExtension } from './const.js';

function App(props) {
  const { site } = props;
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [fileList, setFileList] = useState([]);

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      await fetch(`${BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      setFileList([]);
    },
    onSuccess: () => {
      messageApi.success('Success');
      queryClient.invalidateQueries({ queryKey: ['siteinfo'] });
    },
  });

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('tarball', fileList[0]);
    formData.append('site', site);
    uploadMutation.mutate(formData);
  };

  return (
    <>
      {contextHolder}

      <div style={{ marginBlock: '16px' }}>
        <div>
          <div>Upload Build Archive</div>
          <div style={{ marginBlock: '8px', color: '#666' }}>
            File structure: All files must be at the root of the archive (e.g., avoid having a
            "dist/" folder inside the archive).
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Upload
            accept={fileAccept}
            onRemove={() => {
              setFileList([]);
            }}
            beforeUpload={(file) => {
              console.log(file);
              if (!isValidFileExtension(file.name)) {
                messageApi.error('Invalid format. Use .tar, .tar.gz or .tar.xz');
                return false;
              }
              setFileList([file]);
              return false;
            }}
            fileList={fileList}
          >
            <Button icon={<UploadOutlined />} disabled={!site}>
              Select File
            </Button>
          </Upload>

          <Button
            onClick={handleUpload}
            disabled={fileList.length === 0}
            loading={uploadMutation.status === 'pending'}
          >
            {uploadMutation.status === 'pending' ? 'Uploading...' : 'Start Upload'}
          </Button>
        </div>
      </div>
    </>
  );
}

export default App;
