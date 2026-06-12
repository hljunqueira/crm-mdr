async function fetchInventory() {
  try {
    const res = await fetch('http://localhost:3000/api/inventory');
    if (!res.ok) {
      console.error('HTTP Error:', res.status, res.statusText);
      return;
    }
    const data = await res.json();
    console.log('Response count:', data.length);
    console.log('Sample data:', data.slice(0, 3));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
fetchInventory();
