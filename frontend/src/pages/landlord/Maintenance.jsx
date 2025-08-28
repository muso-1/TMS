import { useEffect, useState } from "react";

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ description: "", status: "open" });
  const [loading, setLoading] = useState(false);

  // Fetch records
  useEffect(() => {
    fetch("http://localhost:5000/api/maintenance")
      .then((res) => res.json())
      .then(setRecords)
      .catch((err) => console.error(err));
  }, []);

  // Handle form change
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Add maintenance record
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setRecords([...records, data]);
      setForm({ description: "", status: "open" });
    } catch (error) {
      console.error("Error adding record", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Maintenance</h1>

      {/* Records Table */}
      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.id}</td>
              <td className="p-2">{r.description}</td>
              <td className="p-2">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Record Form */}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <input
          type="text"
          name="description"
          value={form.description}
          placeholder="Maintenance description"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="border p-2 w-full"
        >
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Saving..." : "Add Record"}
        </button>
      </form>
    </div>
  );
}
