import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spin, Button, Alert, Modal, Input, message } from 'antd';

import { BASE } from './const';

function App() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [isOpen, setIsOpen] = useState(false);

  const [inputValue, setInputValue] = useState('');

  const { status } = useQuery({
    queryKey: ['sitedb'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/inspectsitedb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      const t = JSON.stringify(data.data, null, 2);

      setInputValue(t);

      return t;
    },
    enabled: isOpen,
  });

  const updateMutation = useMutation({
    mutationFn: async (t: string) => {
      const res = await fetch(`${BASE}/api/writesitedb`, {
        method: 'POST',
        body: JSON.stringify({ db: t }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const j = await res.json();
      if (j.code) {
        throw new Error(j.msg);
      }
      return j;
    },
    onSuccess: () => {
      messageApi.success('success');
      queryClient.invalidateQueries({ queryKey: ['sitedb'] });
      queryClient.invalidateQueries({ queryKey: ['listsite'] });
    },
    onError: (error) => {
      messageApi.error(`error: ${error.message}`);
    },
  });

  const closeModal = () => {
    setIsOpen(false);
    setInputValue('');
  };

  return (
    <>
      {contextHolder}

      <Button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Edit Site Db (With caution)
      </Button>

      <Modal
        title="Edit Site Db (Be Extremely Cautious)"
        open={!!isOpen}
        onCancel={closeModal}
        onOk={() => {
          let obj: Record<string, string>;
          try {
            obj = JSON.parse(inputValue);
          } catch (error: any) {
            messageApi.error(`Invalid JSON format: ${error.message}`);
            return;
          }
          const siteKeys = Object.keys(obj);
          if (siteKeys.length !== new Set(siteKeys).size) {
            messageApi.error('Site keys must be unique.');
            return;
          }
          if (!siteKeys.every((x) => /^[a-z]+$/.test(x))) {
            messageApi.error('Site keys must be in [a-z]+ format.');
            return;
          }
          updateMutation.mutate(inputValue);
        }}
        okText="Update Site Db (Be Extremely Cautious)"
        width={820}
      >
        {status === 'pending' && <Spin />}
        {status === 'error' && <div>Error loading data</div>}
        {status === 'success' && (
          <div>
            <Alert
              style={{ marginBottom: '8px' }}
              title="WARNING: Ensure valid JSON format - keys must be site keys, values must be site names."
              type="warning"
            />
            <Alert
              style={{ marginBottom: '8px' }}
              title="WARNING: Site key should be unique (it will be used as path of distribution), and in [a-z]+ format."
              type="warning"
            />
            <Input.TextArea
              style={{ height: '400px' }}
              size="large"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}

export default App;
