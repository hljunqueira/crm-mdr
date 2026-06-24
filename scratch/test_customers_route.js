async function test() {
  const url = 'http://localhost:3000/api/customers?unit_id=cf7efbfd-dd63-4618-9d9b-0887a1ec5032';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Count:', data.length);
    console.log('Data names:', data.map(c => c.name));
  } catch (e) {
    console.error('Error fetching route:', e);
  }
}

test();
