import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';

import Site from './site.jsx';
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
      <div>
        choose site:
        <Select
          loading={status === 'pending'}
          style={{ width: 280 }}
          options={selectSiteOptions}
          value={site}
          onChange={(v) => {
            setSite(v);
          }}
        />
      </div>

      {site && <Site site={site} />}
    </>
  );
}

export default App;
