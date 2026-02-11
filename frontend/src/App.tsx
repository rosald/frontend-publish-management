import { useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';

import { BASE } from './const';

const Db = lazy(() => import('./db'));
const Upload = lazy(() => import('./upload'));
const Site = lazy(() => import('./site'));

function App() {
  const [site, setSite] = useState('');

  const { status, data: sitelist } = useQuery({
    queryKey: ['listsite'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/listsite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const selectSiteOptions = Object.entries<string>(sitelist || {}).map((x) => {
    return {
      label: x[1] + ' ' + '(' + x[0] + ')',
      value: x[0],
    };
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flexGrow: 1 }}>
          <span>Select a site to manage: </span>

          <Select
            loading={status === 'pending'}
            style={{ width: 280 }}
            placeholder="Select site to operate..."
            options={selectSiteOptions}
            value={site || undefined}
            onChange={(v) => {
              setSite(v);
            }}
          />
        </div>
        <div style={{ marginLeft: '100px' }}>
          <Suspense fallback={<div style={{ display: 'inline-block' }}>Loading Db Manager...</div>}>
            <Db />
          </Suspense>
        </div>
      </div>

      {site && (
        <Suspense fallback={<div style={{ padding: '20px' }}>Loading Upload Manager...</div>}>
          <Upload site={site} />
        </Suspense>
      )}
      {site && (
        <Suspense fallback={<div style={{ padding: '20px' }}>Loading Site Manager...</div>}>
          <Site site={site} />
        </Suspense>
      )}
      {!site && (
        <div
          style={{ marginTop: '16px', marginLeft: '100px', color: '#8c8c8c', fontStyle: 'italic' }}
        >
          No site selected - publishing operations will appear after selection
        </div>
      )}
    </>
  );
}

export default App;
