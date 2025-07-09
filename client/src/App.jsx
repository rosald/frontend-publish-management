import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';

import Site from './site.jsx';
import Db from './db.jsx';
import { BASE } from './const.js';

function App() {
  const [site, setSite] = useState('');

  const { status, data: sitelist } = useQuery({
    queryKey: ['listsite'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/listsite`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const selectSiteOptions = sitelist?.map((x) => {
    return {
      label: x,
      value: x,
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
          <Db />
        </div>
      </div>

      {site && <Site site={site} />}
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
